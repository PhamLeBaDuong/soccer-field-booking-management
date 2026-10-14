import test from "node:test";
import assert from "node:assert/strict";
import { invitationFixture } from "./helpers/invitationFixture.js";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { Prisma } from "@prisma/client";

test("HTTP creation ignores a legacy timezone payload and uses the existing service contract", async () => {
    let submitted;
    const context = vm.createContext({ console });
    const service = new vm.SyntheticModule(["createMatchPost"], function () {
        this.setExport("createMatchPost", async payload => { submitted = payload; return { id: "new-post", status: "open" }; });
    }, { context });
    const socket = new vm.SyntheticModule(["getIO"], function () { this.setExport("getIO", () => null); }, { context });
    const controller = new vm.SourceTextModule(await readFile(new URL("../src/controllers/matchPostController.js", import.meta.url), "utf8"), { context });
    await controller.link(specifier => specifier.includes("matchPostService") ? service : socket);
    await controller.evaluate();
    let status, result;
    const res = { status(value) { status = value; return this; }, json(value) { result = value; } };
    await controller.namespace.createMatchPost({ user: { id: "owner" }, body: {
        teamId: "team", fieldId: "field", preferredStartTime: "2099-10-13T15:30Z",
        preferredEndTime: "2099-10-13T17:00Z", timeZone: "America/Indianapolis",
    } }, res);
    assert.equal(status, 201);
    assert.equal(result.status, "open");
    assert.equal(submitted.requesterId, "owner");
    assert.equal(Object.hasOwn(submitted, "timeZone"), false);
});

const request = (start = "15:30", end = "17:00", extra = {}) => ({
    teamId: "team", fieldId: "field", requesterId: "owner",
    preferredStartTime: `2099-10-13T${start}Z`, preferredEndTime: `2099-10-13T${end}Z`, ...extra,
});

test("posting requires distinct members and counts the leader once", async () => {
    for (const count of [1, 4]) {
        const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
        app.state().teams[0].members = app.state().teams[0].members.slice(0, count);
        await assert.rejects(app.matchPosts.createMatchPost(request()), error => error.status === 400 && error.message.includes(`${count}/5 joined`));
        assert.equal(app.state().posts.length, 0);
        assert.equal(app.state().bookings.length, 0);
    }
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    app.state().teams[0].members = Array(5).fill(app.state().teams[0].members[0]);
    await assert.rejects(app.matchPosts.createMatchPost(request()), /1\/5 joined/);
});

test("direct and invitation acceptance reject either incomplete roster without consuming the request", async () => {
    for (const viaLink of [false, true]) {
        for (const teamIndex of [0, 1]) {
            const app = await invitationFixture({ fullTeams: true });
            const link = await app.service.resourceLink("match", "post", "owner");
            const removed = app.state().teams[teamIndex].members.pop();
            const accept = () => viaLink
                ? app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" })
                : app.matchPosts.acceptMatchPost("post", { acceptingTeamId: "opponent", requesterId: "player", code: "PRIVATE" });
            await assert.rejects(accept(), error => error.status === 400 && error.message.includes("4/5 joined"));
            assert.equal(app.state().posts[0].status, "open");
            assert.equal(app.state().responses.length, 0);
            assert.equal(app.state().matches.length, 0);
            assert.equal(app.state().bookings.length, 0);
            assert.equal((await app.service.read(link.token)).detail.membersCount, teamIndex === 0 ? 4 : 5);
            app.state().teams[teamIndex].members.push(removed);
            await accept();
            assert.equal(app.state().matches.length, 1);
            assert.equal(app.state().bookings.length, 10);
        }
    }
});

test("a newly created team with only its leader cannot accept a match invitation", async () => {
    const app = await invitationFixture({ fullTeams: true });
    app.state().teams[1].members = app.state().teams[1].members.slice(0, 1);
    const link = await app.service.resourceLink("match", "post", "owner");
    await assert.rejects(app.service.respond(link.token, "player", "accepted", {
        acceptingTeamId: "opponent",
    }), /Accepting team needs 5 players \(1\/5 joined\)/);
    assert.equal(app.state().posts[0].status, "open");
    assert.equal(app.state().responses.length, 0);
    assert.equal(app.state().bookings.length, 0);
});

test("acceptance rechecks membership after locking", async () => {
    const app = await invitationFixture({ fullTeams: true });
    app.db.$queryRaw = async parts => {
        if (parts[0].includes('FROM "Team"') && app.state().teams[1].members.length === 5) app.state().teams[1].members.pop();
        return [];
    };
    await assert.rejects(app.matchPosts.acceptMatchPost("post", {
        acceptingTeamId: "opponent", requesterId: "player", code: "PRIVATE",
    }), /Accepting team needs 5 players/);
    assert.equal(app.state().posts[0].status, "open");
    assert.equal(app.state().bookings.length, 0);
});

test("legacy match creation writes only fields supported by the generated Prisma client", async () => {
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    (await app.db.field.findUnique({})).metadata = { timeZone: "America/Indianapolis" };
    const model = Prisma.dmmf.datamodel.models.find(model => model.name === "MatchPost");
    assert.ok(model, "Generate Prisma Client from the existing project schema before testing");
    const supportedFields = new Set(model.fields.map(field => field.name));
    assert.equal(supportedFields.has("timeZone"), false);
    const create = app.db.matchPost.create;
    let submitted;
    app.db.matchPost.create = async args => {
        submitted = args.data;
        for (const key of Object.keys(submitted)) {
            assert.ok(supportedFields.has(key), `Unknown MatchPost argument: ${key}`);
        }
        return create(args);
    };
    const post = await app.matchPosts.createMatchPost(request("01:30", "02:00", {
        preferredStartTime: "2099-10-15T01:30:00.000Z",
        preferredEndTime: "2099-10-15T02:00:00.000Z",
        lat: null, lng: null, timeZone: "America/Indianapolis",
    }));
    assert.equal(Object.hasOwn(submitted, "timeZone"), false);
    assert.equal(post.preferredStartTime.toISOString(), "2099-10-15T01:30:00.000Z");
    assert.equal(post.preferredEndTime.toISOString(), "2099-10-15T02:00:00.000Z");
    assert.equal(post.status, "open");
    const link = await app.service.resourceLink("match", post.id, "owner");
    const invite = await app.service.read(link.token, "player");
    assert.equal(invite.detail.timeZone, "America/Indianapolis");
    assert.equal(app.state().matches.length, 0);
    assert.equal(app.state().bookings.length, 0);
});

test("one team can post adjacent slots and different dates without accepting them", async () => {
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    for (const payload of [request(), request("17:00", "18:00"), request("15:30", "17:00", {
        preferredStartTime: "2099-10-14T15:30Z", preferredEndTime: "2099-10-14T17:00Z",
    })]) {
        const post = await app.matchPosts.createMatchPost(payload);
        const link = await app.service.resourceLink("match", post.id, "owner");
        assert.equal((await app.service.read(link.token, "player")).status, "pending");
    }
    assert.equal(app.state().posts.length, 3);
    assert.ok(app.state().posts.every(post => post.status === "open"));
    assert.equal(app.state().matches.length, 0);
    assert.equal(app.state().bookings.length, 0);
});

test("all overlapping windows are rejected across fields and visibility", async () => {
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    await app.matchPosts.createMatchPost(request());
    for (const [start, end] of [["15:30", "17:00"], ["15:00", "16:00"], ["16:30", "17:30"], ["16:00", "16:30"], ["15:00", "18:00"]]) {
        await assert.rejects(app.matchPosts.createMatchPost(request(start, end, { fieldId: "other-field", visibility: "private" })), /overlapping match request/);
    }
    assert.equal(app.state().posts.length, 1);
});

test("concurrent overlapping posts serialize; cancellation frees the team slot", async () => {
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    const results = await Promise.allSettled([app.matchPosts.createMatchPost(request()), app.matchPosts.createMatchPost(request("16:00", "18:00"))]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    await app.matchPosts.cancelMatchPost(app.state().posts[0].id, "owner");
    assert.equal((await app.matchPosts.createMatchPost(request())).status, "open");
});

test("confirmed matches block both teams from posting overlapping requests", async () => {
    const app = await invitationFixture({ fullTeams: true });
    const link = await app.service.resourceLink("match", "post", "owner");
    await app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" });
    await assert.rejects(app.matchPosts.createMatchPost(request()), /overlapping confirmed match/);
    await assert.rejects(app.matchPosts.createMatchPost(request("16:00", "18:00", { teamId: "opponent", requesterId: "player" })), /overlapping confirmed match/);
});

test("acceptance refuses a team that already has an overlapping open request", async () => {
    const app = await invitationFixture({ fullTeams: true });
    await app.matchPosts.createMatchPost(request("16:00", "18:00", { teamId: "opponent", requesterId: "player" }));
    const link = await app.service.resourceLink("match", "post", "owner");
    await assert.rejects(app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" }), /overlapping match request/);
    assert.equal(app.state().matches.length, 0);
    assert.equal(app.state().posts[0].status, "open");
});

test("local afternoon timestamps remain future UTC instants and invitation stays pending", async () => {
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    (await app.db.field.findUnique({})).metadata = { timeZone: "America/Indiana/Indianapolis" };
    const post = await app.matchPosts.createMatchPost(request("22:30", "00:30", {
        preferredEndTime: "2099-10-14T00:30Z", timeZone: "America/Indiana/Indianapolis",
    }));
    assert.equal(Object.hasOwn(post, "timeZone"), false);
    const link = await app.service.resourceLink("match", post.id, "owner");
    const invite = await app.service.read(link.token, "player");
    assert.equal(invite.status, "pending");
    assert.equal(invite.detail.timeZone, "America/Indiana/Indianapolis");
    await app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" });
    assert.equal(app.state().matches.length, 1);
});

test("creating a request and viewing its invitation never creates a match or booking", async () => {
    const app = await invitationFixture({ fullTeams: true }); app.state().posts = [];
    const post = await app.matchPosts.createMatchPost({ teamId: "team", fieldId: "field", requesterId: "owner",
        preferredStartTime: "2099-10-13T15:30Z", preferredEndTime: "2099-10-13T17:00Z" });
    assert.equal(post.status, "open");
    assert.equal(app.state().matches.length, 0);
    assert.equal(app.state().bookings.length, 0);
    const link = await app.service.resourceLink("match", post.id, "owner");
    await app.service.read(link.token, "player");
    assert.equal(app.state().posts[0].status, "open");
    assert.equal(app.state().matches.length, 0);
    assert.equal(app.state().bookings.length, 0);
    await app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" });
    assert.equal(app.state().posts[0].status, "matched");
    assert.equal(app.state().matches.length, 1);
    assert.equal(app.state().bookings.length, 10);
});

test("only the posting team leader cancels and cancellation blocks invitation acceptance", async () => {
    const app = await invitationFixture({ fullTeams: true });
    const link = await app.service.resourceLink("match", "post", "owner");
    await assert.rejects(app.matchPosts.cancelMatchPost("post", "player"), error => error.status === 403);
    assert.equal(app.state().posts[0].status, "open");
    const canceled = await app.matchPosts.cancelMatchPost("post", "owner");
    assert.equal(canceled.status, "canceled");
    assert.equal((await app.service.read(link.token)).status, "canceled");
    await assert.rejects(app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" }), /canceled/);
    await assert.rejects(app.matchPosts.cancelMatchPost("post", "owner"), /already canceled/);
    assert.equal(app.state().bookings.length, 0);
});

test("a matched request cannot be canceled or overwrite a competing acceptance", async () => {
    for (const cancelFirst of [true, false]) {
        const app = await invitationFixture({ fullTeams: true });
        const link = await app.service.resourceLink("match", "post", "owner");
        const accept = () => app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" });
        const cancel = () => app.matchPosts.cancelMatchPost("post", "owner");
        const actions = cancelFirst ? [cancel, accept] : [accept, cancel];
        const results = await Promise.allSettled(actions.map(action => action()));
        assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
        const status = app.state().posts[0].status;
        assert.ok(["matched", "canceled"].includes(status));
        assert.equal(app.state().matches.length, status === "matched" ? 1 : 0);
        assert.equal(app.state().bookings.length, status === "matched" ? 10 : 0);
        if (status === "matched") await assert.rejects(app.matchPosts.cancelMatchPost("post", "owner"), /already matched/);
    }
});
