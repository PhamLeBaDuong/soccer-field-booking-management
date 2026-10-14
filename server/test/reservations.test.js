import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { randomBytes } from "node:crypto";
import { validateReservationTime, groupReservations } from "../src/services/reservationService.js";
import { bookingOccurrences, bookingDayRange } from "../src/services/bookingScheduleService.js";
import { Prisma } from "@prisma/client";

const field = { id: "field", ownerId: "host", pricePerHour: 200000,
    startTime: new Date("2000-01-01T06:00:00Z"), endTime: new Date("2000-01-01T23:00:00Z") };
const startTime = "2099-01-01T18:00:00Z", endTime = "2099-01-01T18:30:00Z";

// Load actual services with an in-memory database module. Never import db.cjs or .env.
async function services(fieldOverrides = {}) {
    const actualField = { ...field, ...fieldOverrides };
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
        field: { findUnique: async ({ where }) => where.id === actualField.id ? actualField : null },
        booking: {
            findMany: async ({ where, select }) => state.bookings.filter(row => matches(row, where)).map(row =>
                select ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : row),
            findFirst: async ({ where }) => state.bookings.find(row => matches(row, where)) ?? null,
            create: async ({ data }) => {
                assert.ok(locked, "booking writes must hold the field lock");
                const schemaFields = new Set(Prisma.dmmf.datamodel.models.find(model => model.name === "Booking").fields.map(field => field.name));
                for (const key of Object.keys(data)) assert.ok(schemaFields.has(key), `Unknown Booking argument: ${key}`);
                const row = { id: "booking-" + ++sequence, bookingType: "direct", ...data }; state.bookings.push(row); return row;
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
        team: { findUnique: async ({ where }) => ({ id: where.id, leaderId: where.id === "home" ? "host" : "opponent", size: 5,
            members: Array.from({ length: 5 }, (_, index) => {
                const userId = `${where.id}-player-${index}`;
                return { userId, user: { id: userId } };
            }) }) },
        matchPost: {
            findFirst: async ({ where }) => state.posts.find(row => matches(row, where)) ?? null,
            findUnique: async () => state.posts[0],
            updateMany: async ({ where, data }) => {
                const rows = state.posts.filter(row => matches(row, where));
                rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
            },
            update: async ({ data }) => Object.assign(state.posts[0], data),
        },
        match: {
            findFirst: async () => null,
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

test("lobby creator and related field owner can cancel an unfilled lobby", async () => {
    for (const requesterId of ["creator", "host"]) {
        const app = await services();
        const { lobby } = await app.lobby.createLobby({ creatorId: "creator", fieldId: "field",
            startTime, endTime, teamSize: 4 });
        await app.lobby.joinLobby(lobby.id, "player");
        const canceled = await app.lobby.cancelLobby(lobby.id, requesterId);
        assert.equal(canceled.status, "canceled");
        assert.equal(app.state().bookings.length, 0);
        await assert.rejects(app.lobby.joinLobby(lobby.id, "new-player"), /already/);
        await assert.rejects(app.lobby.cancelLobby(lobby.id, requesterId), /already canceled/);
    }
});

test("participants and unrelated users cannot cancel a lobby", async () => {
    const app = await services();
    const { lobby } = await app.lobby.createLobby({ creatorId: "creator", fieldId: "field",
        startTime, endTime, teamSize: 4 });
    await app.lobby.joinLobby(lobby.id, "player");
    for (const requesterId of ["player", "unrelated-owner"]) {
        await assert.rejects(app.lobby.cancelLobby(lobby.id, requesterId), error => error.status === 403);
        assert.equal(app.state().lobbies[0].status, "open");
    }
    await assert.rejects(app.lobby.cancelLobby(lobby.id, ""), /requesterId is required/);
});

test("neither owner can cancel full or confirmed lobbies, including stale open status", async () => {
    for (const status of ["full", "confirmed", "matched", "open"]) {
        for (const requesterId of ["creator", "host"]) {
            const app = await services();
            const { lobby } = await app.lobby.createLobby({ creatorId: "creator", fieldId: "field",
                startTime, endTime, teamSize: 2 });
            app.state().lobbies[0].status = status;
            app.state().slots.push({ lobbyId: lobby.id, userId: "player" });
            await assert.rejects(app.lobby.cancelLobby(lobby.id, requesterId), /Cannot cancel/);
            assert.equal(app.state().lobbies[0].status, status);
        }
    }
});

test("cancellation cannot race a final join into a confirmed lobby", async () => {
    for (const cancelFirst of [true, false]) {
        const app = await services();
        const { lobby } = await app.lobby.createLobby({ creatorId: "creator", fieldId: "field",
            startTime, endTime, teamSize: 2 });
        const actions = cancelFirst
            ? [() => app.lobby.cancelLobby(lobby.id, "host"), () => app.lobby.joinLobby(lobby.id, "player")]
            : [() => app.lobby.joinLobby(lobby.id, "player"), () => app.lobby.cancelLobby(lobby.id, "host")];
        const results = await Promise.allSettled(actions.map(action => action()));
        assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
        const status = app.state().lobbies[0].status;
        assert.ok(["canceled", "confirmed"].includes(status));
        assert.equal(app.state().bookings.length, status === "confirmed" ? 2 : 0);
    }
});

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
    assert.equal(app.state().bookings.length, 10);
    assert.ok(app.state().bookings.every(row => row.matchId === match.id));
});

test("schedules keep separate direct reservations and group participants by lobby or match", () => {
    const rows = [{ id: "a", matchId: null }, { id: "b", matchId: null },
        { id: "c", lobbyId: "l" }, { id: "d", lobbyId: "l" }, { id: "e", matchId: "m" }, { id: "f", matchId: "m" }];
    assert.deepEqual(groupReservations(rows).map(row => row.id), ["a", "b", "c", "e"]);
});

test("weekly fixed bookings reserve every date through the inclusive end date", async () => {
    const app = await services();
    const result = await app.booking.createBookingBatch({ userId: "player", fieldId: "field", startTime, endTime,
        repeat: { frequency: "weekly", until: "2099-01-22" } });
    assert.equal(result.bookings.length, 4);
    assert.equal(result.totalPrice, 400000);
    assert.deepEqual(Array.from(result.bookings, booking => booking.startTime.toISOString().slice(0, 10)), ["2099-01-01", "2099-01-08", "2099-01-15", "2099-01-22"]);
    assert.ok(result.bookings.every(booking => booking.bookingType === "fixed" && booking.matchId === null && booking.lobbyId === null));
    await assert.rejects(app.booking.createBooking({ userId: "other", fieldId: "field", startTime: "2099-01-15T18:00Z", endTime: "2099-01-15T18:30Z" }), /already booked/);
});

test("monthly bookings keep the date and skip months without that day", async () => {
    const app = await services();
    const result = await app.booking.createBookingBatch({ userId: "player", fieldId: "field",
        startTime: "2099-01-31T18:00Z", endTime: "2099-01-31T19:00Z", repeat: { frequency: "monthly", until: "2099-05-31" } });
    assert.deepEqual(Array.from(result.bookings, booking => booking.startTime.toISOString().slice(0, 10)), ["2099-01-31", "2099-03-31", "2099-05-31"]);
});

test("one conflict rejects the entire fixed booking without partial reservations", async () => {
    const app = await services();
    await app.booking.createBooking({ userId: "other", fieldId: "field", startTime: "2099-01-15T18:00Z", endTime: "2099-01-15T18:30Z" });
    await assert.rejects(app.booking.createBookingBatch({ userId: "player", fieldId: "field", startTime, endTime,
        repeat: { frequency: "weekly", until: "2099-01-22" } }), /already booked/);
    assert.equal(app.state().bookings.length, 1);
    assert.equal(app.state().bookings[0].userId, "other");
});

test("a failed recurring booking insert rolls back every occurrence", async () => {
    const app = await services();
    const create = app.db.booking.create;
    let writes = 0;
    app.db.booking.create = args => {
        if (++writes === 2) throw new Error("Booking storage failed");
        return create(args);
    };
    await assert.rejects(app.booking.createBookingBatch({ userId: "player", fieldId: "field", startTime, endTime,
        repeat: { frequency: "weekly", until: "2099-01-22" } }), /Booking storage failed/);
    assert.equal(app.state().bookings.length, 0);
});

test("concurrent fixed and direct booking requests cannot reserve the same occurrence", async () => {
    const app = await services();
    const results = await Promise.allSettled([
        app.booking.createBookingBatch({ userId: "player", fieldId: "field", startTime, endTime, repeat: { frequency: "weekly", until: "2099-01-08" } }),
        app.booking.createBooking({ userId: "other", fieldId: "field", startTime: "2099-01-08T18:00Z", endTime: "2099-01-08T18:30Z" }),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(app.state().bookings.length, 2);
});

test("manual fixed bookings require venue ownership and preserve customer notes", async () => {
    const app = await services({ metadata: { timeZone: "America/Indiana/Indianapolis" } });
    const payload = { userId: "host", ownerId: "host", fieldId: "field", date: "2099-01-01", startTime: "18:00", endTime: "18:30",
        note: "Customer — Thursday practice", repeat: { frequency: "weekly", until: "2099-01-08" } };
    await assert.rejects(app.booking.createBookingBatch({ ...payload, ownerId: "other" }), error => error.status === 403);
    assert.equal(app.state().bookings.length, 0);
    const result = await app.booking.createBookingBatch(payload);
    assert.equal(result.bookings.length, 2);
    assert.equal(result.bookings[0].startTime.toISOString(), "2099-01-01T23:00:00.000Z");
    assert.ok(result.bookings.every(booking => booking.note === payload.note));
});

test("weekly recurrence keeps the local clock across daylight saving changes", async () => {
    const app = await services({ metadata: { timeZone: "America/Indiana/Indianapolis" } });
    const result = await app.booking.createBookingBatch({ userId: "player", fieldId: "field",
        startTime: "2027-03-07T23:30Z", endTime: "2027-03-08T00:00Z", repeat: { frequency: "weekly", until: "2027-03-21" } });
    assert.deepEqual(Array.from(result.bookings, booking => booking.startTime.toISOString()), ["2027-03-07T23:30:00.000Z", "2027-03-14T22:30:00.000Z", "2027-03-21T22:30:00.000Z"]);
    assert.equal(result.totalPrice, 300000);
});

test("overnight fixed bookings use the next local calendar day", async () => {
    const app = await services({ startTime: "2000-01-01T18:00Z", endTime: "2000-01-01T03:00Z", metadata: { timeZone: "America/Indiana/Indianapolis" } });
    const result = await app.booking.createBookingBatch({ userId: "host", ownerId: "host", fieldId: "field", date: "2099-01-01",
        startTime: "23:30", endTime: "00:30", repeat: { frequency: "weekly", until: "2099-01-08" } });
    assert.equal(result.bookings.length, 2);
    assert.equal(result.bookings[0].endTime.toISOString(), "2099-01-02T05:30:00.000Z");
});

test("invalid recurrence rules and nonexistent local times create no reservations", async () => {
    for (const repeat of [{ frequency: "daily", until: "2099-02-01" }, { frequency: "weekly", until: "2099-02-30" },
        { frequency: "weekly", until: "2098-12-31" }, { frequency: "weekly", until: "2105-01-01" }]) {
        const app = await services();
        await assert.rejects(app.booking.createBookingBatch({ userId: "player", fieldId: "field", startTime, endTime, repeat }));
        assert.equal(app.state().bookings.length, 0);
    }
    const allDay = { ...field, startTime: "2000-01-01T00:00Z", endTime: "2000-01-01T00:00Z", metadata: { timeZone: "America/Indiana/Indianapolis" } };
    assert.throws(() => bookingOccurrences(allDay, "2027-03-07T07:30Z", "2027-03-07T08:00Z", { frequency: "weekly", until: "2027-03-14" }), /clocks change/);
});

test("public availability includes fixed reservations without exposing their type or customer", async () => {
    const app = await services();
    await app.booking.createBookingBatch({ userId: "host", fieldId: "field", startTime, endTime, note: "Private customer",
        repeat: { frequency: "weekly", until: "2099-01-08" } });
    const slots = await app.booking.getOccupiedSlots("field", "2099-01-08T00:00Z", "2099-01-09T00:00Z");
    assert.equal(slots.length, 1);
    assert.deepEqual(Object.keys(slots[0]).sort(), ["endTime", "startTime"]);
    const range = bookingDayRange("2099-01-08", { ...field, metadata: { timeZone: "America/Indiana/Indianapolis" } });
    assert.equal(range.start.toISOString(), "2099-01-08T11:00:00.000Z");
});
