import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { randomBytes } from "node:crypto";
import { validateReservationTime, groupReservations } from "../src/services/reservationService.js";

const field = { id: "field", ownerId: "host", pricePerHour: 200000,
    startTime: new Date("2000-01-01T06:00:00Z"), endTime: new Date("2000-01-01T23:00:00Z") };
const startTime = "2099-01-01T18:00:00Z", endTime = "2099-01-01T18:30:00Z";

// Load actual services with an in-memory database module. Never import db.cjs or .env.
async function services() {
    let state = { bookings: [], lobbies: [], slots: [], matches: [], posts: [] };
    let queue = Promise.resolve(), locked = false, sequence = 0;
    const matches = (row, where) => Object.entries(where ?? {}).every(([key, value]) => {
        if (key === "AND") return value.every(part => matches(row, part));
        if (value && typeof value === "object" && !(value instanceof Date)) {
            if ("in" in value) return value.in.includes(row[key]);
            if ("notIn" in value) return !value.notIn.includes(row[key]);
            if ("lt" in value) return +new Date(row[key]) < +new Date(value.lt);
            if ("gt" in value) return +new Date(row[key]) > +new Date(value.gt);
        }
        if (value instanceof Date) return +new Date(row[key]) === +value;
        return row[key] === value;
    });
    const lobbyRecord = row => row && { ...row, slots: state.slots.filter(slot => slot.lobbyId === row.id) };
    const db = {
        $queryRaw: async () => { locked = true; return [{ id: field.id }]; },
        $transaction: action => {
            const operation = queue.then(async () => {
                const snapshot = structuredClone(state);
                try { return await action(db); }
                catch (error) { state = snapshot; throw error; }
                finally { locked = false; }
            });
            queue = operation.catch(() => {});
            return operation;
        },
        field: { findUnique: async ({ where }) => where.id === field.id ? field : null },
        booking: {
            findFirst: async ({ where }) => state.bookings.find(row => matches(row, where)) ?? null,
            create: async ({ data }) => {
                assert.ok(locked, "booking writes must hold the field lock");
                const row = { id: "booking-" + ++sequence, ...data }; state.bookings.push(row); return row;
            },
            createMany: async ({ data }) => {
                for (const row of data) await db.booking.create({ data: row });
                return { count: data.length };
            },
            updateMany: async ({ where, data }) => {
                const rows = state.bookings.filter(row => matches(row, where));
                rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
            },
        },
        lobby: {
            findUnique: async ({ where }) => lobbyRecord(state.lobbies.find(row => row.id === where.id)),
            findFirst: async ({ where }) => lobbyRecord(state.lobbies.find(row => matches(row, where))),
            create: async ({ data }) => {
                const row = { id: "lobby-" + ++sequence, ...data }; state.lobbies.push(row); return lobbyRecord(row);
            },
            update: async ({ where, data }) => {
                const row = state.lobbies.find(row => row.id === where.id); Object.assign(row, data); return lobbyRecord(row);
            },
        },
        lobbySlot: { create: async ({ data }) => { state.slots.push({ id: "slot-" + ++sequence, ...data }); } },
        team: { findUnique: async ({ where }) => ({ id: where.id, leaderId: "opponent", size: 5,
            members: [{ user: { id: "opponent" } }] }) },
        matchPost: {
            findUnique: async () => state.posts[0],
            updateMany: async ({ where, data }) => {
                const rows = state.posts.filter(row => matches(row, where));
                rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
            },
            update: async ({ data }) => Object.assign(state.posts[0], data),
        },
        match: {
            create: async ({ data }) => {
                const row = { id: "match-" + ++sequence, ...data }; state.matches.push(row);
                for (const booking of data.bookings.create) await db.booking.create({ data: { ...booking, matchId: row.id } });
                return row;
            },
            findUnique: async ({ where }) => state.matches.find(row => row.id === where.id),
        },
    };
    const context = vm.createContext({ console, Date, Set });
    const modules = new Map();
    const database = new vm.SyntheticModule(["default"], function () { this.setExport("default", db); }, { context });
    async function load(url) {
        if (url.endsWith("/crypto")) return new vm.SyntheticModule(["randomBytes"], function () {
            this.setExport("randomBytes", randomBytes);
        }, { context });
        if (url.endsWith("/db.cjs")) return database;
        if (modules.has(url)) return modules.get(url);
        const mod = new vm.SourceTextModule(await readFile(new URL(url), "utf8"), { context, identifier: url });
        modules.set(url, mod);
        await mod.link((specifier, parent) => load(new URL(specifier, parent.identifier).href));
        return mod;
    }
    async function service(name) {
        const mod = await load(new URL("../src/services/" + name + ".js", import.meta.url).href);
        await mod.evaluate(); return mod.namespace;
    }
    const booking = await service("bookingService"), lobby = await service("lobbyService"), post = await service("matchPostService");
    return { booking, lobby, post, db, state: () => state };
}

test("half-hour pricing and overnight operating hours", () => {
    for (const [end, expected] of [["18:30", 100000], ["19:00", 200000], ["19:30", 300000]]) {
        assert.equal(validateReservationTime(field, startTime, "2099-01-01T" + end + ":00Z").totalPrice, expected);
    }
    assert.throws(() => validateReservationTime(field, startTime, "invalid"), /Invalid/);
    assert.throws(() => validateReservationTime(field, endTime, startTime), /after/);
    assert.throws(() => validateReservationTime(field, "2099-01-01T23:00:00Z", "2099-01-01T23:30:00Z"), /operating/);
    const overnight = { ...field, startTime: "2000-01-01T18:00:00Z", endTime: "2000-01-01T02:00:00Z" };
    assert.equal(validateReservationTime(overnight, "2099-01-01T23:30:00Z", "2099-01-02T00:30:00Z").totalPrice, 200000);
});

test("direct booking is confirmed, priced on server, and has no match or lobby", async () => {
    const app = await services();
    const booking = await app.booking.createBooking({ userId: "host", fieldId: "field", startTime, endTime, totalPrice: 1 });
    assert.equal(booking.totalPrice, 100000);
    assert.equal(booking.status, "confirmed"); assert.equal(booking.paymentStatus, "unpaid");
    assert.equal(booking.matchId, null); assert.equal(booking.lobbyId, null);
    assert.equal(app.state().matches.length, 0);
});

test("full lobby assigns each participant a booking without creating a match", async () => {
    const app = await services();
    const { lobby } = await app.lobby.createLobby({ creatorId: "host", fieldId: "field", startTime, endTime, teamSize: 2 });
    assert.equal(app.state().bookings.length, 0);
    const result = await app.lobby.joinLobby(lobby.id, "player");
    assert.equal(result.lobby.status, "confirmed"); assert.equal(app.state().matches.length, 0);
    assert.deepEqual(app.state().bookings.map(row => row.userId).sort(), ["host", "player"]);
    for (const booking of app.state().bookings) {
        assert.equal(booking.lobbyId, lobby.id); assert.equal(booking.matchId, null); assert.equal(booking.totalPrice, 100000);
    }
    await assert.rejects(app.lobby.joinLobby(lobby.id, "third"), /already/);
    await assert.rejects(app.lobby.cancelLobby(lobby.id, "host"), /Cannot cancel/);
    assert.equal(app.state().bookings.length, 2);
});

test("a slot booked while lobby is filling does not get confirmed again", async () => {
    const app = await services();
    const { lobby } = await app.lobby.createLobby({ creatorId: "host", fieldId: "field", startTime, endTime, teamSize: 2 });
    await app.booking.createBooking({ userId: "other", fieldId: "field", startTime, endTime });
    const result = await app.lobby.joinLobby(lobby.id, "player");
    assert.equal(result.lobby.status, "canceled"); assert.equal(app.state().bookings.length, 1);
});

test("a failed participant booking rolls back the final join and all new bookings", async () => {
    const app = await services();
    const { lobby } = await app.lobby.createLobby({ creatorId: "host", fieldId: "field", startTime, endTime, teamSize: 2 });
    const originalCreate = app.db.booking.create;
    let writes = 0;
    app.db.booking.create = async args => {
        if (++writes === 2) throw new Error("Simulated storage failure");
        return originalCreate(args);
    };
    await assert.rejects(app.lobby.joinLobby(lobby.id, "player"), /storage failure/);
    assert.equal(app.state().bookings.length, 0);
    assert.equal(app.state().slots.length, 0);
    assert.equal(app.state().lobbies[0].status, "open");
});

test("two final joins cannot overfill or confirm a lobby twice", async () => {
    const app = await services();
    const { lobby } = await app.lobby.createLobby({ creatorId: "host", fieldId: "field", startTime, endTime, teamSize: 2 });
    const results = await Promise.allSettled(["one", "two"].map(userId => app.lobby.joinLobby(lobby.id, userId)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(app.state().bookings.length, 2);
    assert.equal(app.state().slots.length, 1);
});

test("simultaneous direct reservations recheck availability under the lock; adjacent slots are allowed", async () => {
    const app = await services();
    const results = await Promise.allSettled(["one", "two"].map(userId => app.booking.createBooking({ userId, fieldId: "field", startTime, endTime })));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    await app.booking.createBooking({ userId: "three", fieldId: "field", startTime: endTime, endTime: "2099-01-01T19:00:00Z" });
    assert.equal(app.state().bookings.length, 2);
});

test("opponent acceptance still creates a match and linked participant bookings", async () => {
    const app = await services();
    app.state().posts.push({ id: "post", teamId: "home", status: "open", visibility: "public", fieldId: "field",
        preferredStartTime: startTime, preferredEndTime: endTime,
        team: { size: 5, members: [{ user: { id: "host" } }] } });
    const match = await app.post.acceptMatchPost("post", { acceptingTeamId: "away", requesterId: "opponent" });
    assert.equal(match.source, "post"); assert.equal(app.state().matches.length, 1);
    assert.equal(app.state().bookings.length, 2);
    assert.ok(app.state().bookings.every(row => row.matchId === match.id));
});

test("schedules keep separate direct reservations and group participants by lobby or match", () => {
    const rows = [{ id: "a", matchId: null }, { id: "b", matchId: null },
        { id: "c", lobbyId: "l" }, { id: "d", lobbyId: "l" }, { id: "e", matchId: "m" }, { id: "f", matchId: "m" }];
    assert.deepEqual(groupReservations(rows).map(row => row.id), ["a", "b", "c", "e"]);
});
