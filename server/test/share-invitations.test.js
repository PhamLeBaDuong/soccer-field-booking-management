import test from "node:test";
import assert from "node:assert/strict";
import { invitationFixture } from "./helpers/invitationFixture.js";

test("lobby and match links are owner-only, random and stable", async () => {
    const app = await invitationFixture();
    for (const [kind, target] of [["match", "post"], ["lobby", "lobby"]]) {
        await assert.rejects(app.service.create(kind, target, "player"), error => error.status === 403);
        const invite = await app.service.create(kind, target, "owner");
        assert.match(invite.token, /^[a-f0-9]{64}$/);
        assert.notEqual(app.state().invitations.at(-1).tokenHash, invite.token);
        assert.equal((await app.service.read(invite.token)).status, "pending");
        await assert.rejects(app.service.revoke(invite.id, "player"), error => error.status === 403);
        await assert.rejects(app.service.revoke(invite.id, "owner"), /cannot be revoked/);
        assert.equal((await app.service.create(kind, target, "owner")).token, invite.token);
        assert.equal((await app.service.resourceLink(kind, target, "owner")).token, invite.token);
        assert.equal(invite.expiresAt, null);
    }
    await assert.rejects(app.service.read("invalid"), error => error.status === 404);
});
test("team has one permanent reusable link and duplicate clicks are idempotent", async () => {
    const app = await invitationFixture();
    const invite = await app.service.create("team", "team", "owner");
    const results = await Promise.allSettled(["player", "other"].map(user => app.service.respond(invite.token, user, "accepted")));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 2);
    assert.equal(app.state().teams[0].members.length, 3);
    assert.equal(app.state().responses.length, 2);
    await app.service.respond(invite.token, "player", "accepted");
    assert.equal(app.state().teams[0].members.length, 3);
    assert.equal((await app.service.teamLink("team", "player")).token, invite.token);
    assert.equal((await app.service.create("team", "team", "owner")).token, invite.token);
    assert.equal(app.state().invitations.length, 1);
    assert.equal(app.state().invitations[0].status, "pending");
    assert.equal(app.state().invitations[0].expiresAt, null);
    await assert.rejects(app.service.teamLink("team", "outsider"), error => error.status === 403);
    await assert.rejects(app.service.revoke(invite.id, "owner"), /cannot be revoked/);
});
test("declining records only the recipient's response and does not consume a link", async () => {
    const app = await invitationFixture();
    const invite = await app.service.create("team", "team", "owner");
    await app.service.respond(invite.token, "player", "declined");
    assert.equal((await app.service.read(invite.token, "player")).response.decision, "declined");
    assert.equal((await app.service.read(invite.token, "other")).status, "pending");
    await app.service.respond(invite.token, "player", "accepted");
    await app.service.respond(invite.token, "other", "accepted");
    assert.equal(app.state().teams[0].members.length, 3);
});
test("concurrent team-link retrieval is stable and capacity checks serialize", async () => {
    const app = await invitationFixture(); app.state().teams[0].size = 2;
    const links = await Promise.all([1, 2].map(() => app.service.create("team", "team", "owner")));
    assert.equal(links[0].token, links[1].token);
    assert.equal(app.state().invitations.length, 1);
    const results = await Promise.allSettled(links.map((link, i) => app.service.respond(link.token, `player-${i}`, "accepted")));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(app.state().teams[0].members.length, 2);
});
test("permanent team link survives full capacity and members can leave and rejoin", async () => {
    const app = await invitationFixture(); app.state().teams[0].size = 2;
    const link = await app.service.teamLink("team", "owner");
    await app.service.respond(link.token, "player", "accepted");
    assert.equal((await app.service.read(link.token)).status, "full");
    await assert.rejects(app.service.respond(link.token, "other", "accepted"), /full/);
    app.state().teams[0].members = app.state().teams[0].members.filter(member => member.userId !== "player");
    assert.equal((await app.service.read(link.token, "player")).response, null);
    assert.equal((await app.service.read(link.token)).status, "pending");
    await app.service.respond(link.token, "player", "accepted");
    assert.equal(app.state().teams[0].members.length, 2);
    assert.equal((await app.service.teamLink("team", "owner")).token, link.token);
});
test("old team invitation links are replaced by the single permanent link", async () => {
    const app = await invitationFixture();
    const oldLink = await app.service.teamLink("team", "owner");
    app.state().invitations[0].teamKey = null;
    const permanent = await app.service.teamLink("team", "owner");
    assert.notEqual(permanent.token, oldLink.token);
    assert.equal((await app.service.read(oldLink.token)).status, "replaced");
    await assert.rejects(app.service.respond(oldLink.token, "player", "accepted"), /replaced/);
    assert.equal((await app.service.read(permanent.token)).status, "pending");
});
test("lobby link is reusable and the last join confirms bookings exactly once", async () => {
    const app = await invitationFixture();
    const link = await app.service.create("lobby", "lobby", "owner");
    await app.service.respond(link.token, "player", "accepted");
    assert.equal((await app.service.read(link.token)).status, "pending");
    const results = await Promise.allSettled(["other", "third"].map(user => app.service.respond(link.token, user, "accepted")));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(app.state().slots.length, 2);
    assert.equal(app.state().bookings.length, 3);
    await app.service.respond(link.token, "player", "accepted");
    assert.equal(app.state().slots.length, 2);
});
test("private match invitation reuses match acceptance and creates one match", async () => {
    const app = await invitationFixture({ fullTeams: true });
    const link = await app.service.create("match", "post", "owner");
    await assert.rejects(app.service.respond(link.token, "other", "accepted", { acceptingTeamId: "opponent" }), /leader/);
    assert.equal(app.state().responses.length, 0);
    const result = await app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" });
    assert.ok(result.resultId);
    assert.equal(app.state().matches.length, 1);
    assert.equal(app.state().bookings.length, 10);
    await app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" });
    assert.equal(app.state().matches.length, 1);
});
test("permanent links ignore expiry but block started, canceled and unauthenticated actions", async () => {
    const app = await invitationFixture();
    const link = await app.service.create("lobby", "lobby", "owner");
    await assert.rejects(app.service.respond(link.token, null, "accepted"), error => error.status === 401);
    await assert.rejects(app.service.respond(link.token, "owner", "accepted"), /own invitation/);
    app.state().invitations[0].expiresAt = new Date(0);
    assert.equal((await app.service.read(link.token)).status, "pending");
    app.state().lobbies[0].startTime = new Date(0);
    await assert.rejects(app.service.respond(link.token, "player", "accepted"), /started/);
    app.state().lobbies[0].startTime = new Date("2099-10-12T15:30Z");
    app.state().lobbies[0].status = "canceled";
    await assert.rejects(app.service.respond(link.token, "player", "accepted"), /canceled/);
    assert.equal(app.state().slots.length, 0);
});
test("one stable match link only creates one match across concurrent accepting teams", async () => {
    const app = await invitationFixture({ fullTeams: true });
    app.state().teams.push({ id: "another-opponent", leaderId: "other", size: 5, members: Array.from({ length: 5 }, (_, index) => {
        const userId = index === 0 ? "other" : `other-player-${index}`;
        return { userId, user: { id: userId } };
    }) });
    const link = await app.service.resourceLink("match", "post", "owner");
    const results = await Promise.allSettled([
        app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" }),
        app.service.respond(link.token, "other", "accepted", { acceptingTeamId: "another-opponent" }),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(app.state().matches.length, 1);
    assert.equal((await app.service.resourceLink("match", "post", "owner")).token, link.token);
    assert.equal((await app.service.read(link.token)).status, "matched");
});

test("failure saving a response rolls back membership, acceptance and booking changes", async () => {
    for (const [kind, targetId] of [["team", "team"], ["match", "post"], ["lobby", "lobby"]]) {
        const app = await invitationFixture({ fullTeams: kind === "match" });
        const link = await app.service.create(kind, targetId, "owner");
        app.db.shareInvitationResponse.create = async () => { throw new Error("Response storage failed"); };
        await assert.rejects(app.service.respond(link.token, "player", "accepted", { acceptingTeamId: "opponent" }), /Response storage failed/);
        assert.equal(app.state().invitations[0].status, "pending");
        assert.equal(app.state().teams[0].members.length, kind === "match" ? 5 : 1);
        assert.equal(app.state().slots.length, 0);
        assert.equal(app.state().matches.length, 0);
        assert.equal(app.state().bookings.length, 0);
    }
});
