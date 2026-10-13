import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createHash, randomBytes } from "node:crypto";

// Actual services with isolated sample data. Never imports db.cjs or reads .env.
export async function invitationFixture() {
    let state = { invitations: [], responses: [], teams: [
        { id: "team", name: "PitchBook United", leaderId: "owner", size: 5, members: [{ userId: "owner", user: { id: "owner" } }] },
        { id: "opponent", name: "Riverside FC", leaderId: "player", size: 5, members: [{ userId: "player", user: { id: "player" } }] },
    ], lobbies: [{ id: "lobby", creatorId: "owner", fieldId: "field", initialSize: 1, teamSize: 3, status: "open",
        startTime: new Date("2099-10-12T15:30Z"), endTime: new Date("2099-10-12T17:00Z") }], slots: [], bookings: [],
    posts: [{ id: "post", teamId: "team", fieldId: "field", status: "open", visibility: "private", code: "PRIVATE",
        preferredStartTime: new Date("2099-10-13T15:30Z"), preferredEndTime: new Date("2099-10-13T17:00Z") }], matches: [] };
    const field = { id: "field", name: "Central Pitch", ownerId: "owner", pricePerHour: 100,
        startTime: new Date("2000-01-01T06:00Z"), endTime: new Date("2000-01-01T22:00Z") };
    let queue = Promise.resolve(), sequence = 0;
    const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
        if (key === "AND") return value.every(part => matches(row, part));
        if (value && typeof value === "object" && !(value instanceof Date)) {
            if ("lt" in value) return +new Date(row[key]) < +new Date(value.lt);
            if ("gt" in value) return +new Date(row[key]) > +new Date(value.gt);
            if ("in" in value) return value.in.includes(row[key]);
            if ("notIn" in value) return !value.notIn.includes(row[key]);
        }
        return row[key] === value;
    });
    function model(key, hydrate = row => row) {
        return {
            findUnique: async ({ where }) => hydrate(state[key].find(row => matches(row,
                where.invitationId_userId ?? where.teamId_userId ?? where))) ?? null,
            findFirst: async ({ where }) => hydrate(state[key].find(row => matches(row, where))) ?? null,
            findMany: async ({ where = {}, orderBy } = {}) => {
                const rows = state[key].filter(row => matches(row, where));
                if (orderBy?.createdAt === "desc") rows.sort((a, b) => +b.createdAt - +a.createdAt);
                return rows.map(hydrate);
            },
            create: async ({ data }) => {
                const row = { id: `${key}-${++sequence}`, createdAt: new Date(), status: "pending", ...data };
                state[key].push(row); return hydrate(row);
            },
            update: async ({ where, data }) => {
                const row = state[key].find(row => matches(row, where)); Object.assign(row, data); return hydrate(row);
            },
            updateMany: async ({ where, data }) => {
                const rows = state[key].filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
            },
        };
    }
    const db = {
        $queryRaw: async () => [],
        $transaction: action => {
            const result = queue.then(async () => {
                const before = structuredClone(state);
                try { return await action(db); } catch (error) { state = before; throw error; }
            });
            queue = result.catch(() => {}); return result;
        },
        field: { findUnique: async () => field },
        shareInvitation: model("invitations"), shareInvitationResponse: model("responses"),
        team: model("teams"),
        teamMember: { create: async ({ data }) => {
            const team = state.teams.find(team => team.id === data.teamId);
            if (team.members.some(member => member.userId === data.userId)) throw new Error("Duplicate membership");
            const row = { ...data, user: { id: data.userId } }; team.members.push(row); return row;
        } },
        lobby: model("lobbies", row => row && { ...row, field, slots: state.slots.filter(slot => slot.lobbyId === row.id) }),
        lobbySlot: model("slots"),
        matchPost: model("posts", row => row && { ...row, field, team: state.teams.find(team => team.id === row.teamId) }),
        booking: { ...model("bookings"), createMany: async ({ data }) => {
            for (const row of data) await db.booking.create({ data: row }); return { count: data.length };
        } },
        match: { ...model("matches"), create: async ({ data }) => {
            const row = { ...data, id: `match-${++sequence}` }; state.matches.push(row);
            for (const booking of data.bookings.create) await db.booking.create({ data: { ...booking, matchId: row.id } });
            return row;
        } },
    };
    db.shareInvitationResponse.upsert = async ({ where, create, update }) => {
        const row = await db.shareInvitationResponse.findUnique({ where });
        return row ? db.shareInvitationResponse.update({ where: { id: row.id }, data: update })
            : db.shareInvitationResponse.create({ data: create });
    };
    const context = vm.createContext({ console, Date, Set, Object, Math });
    const modules = new Map();
    const database = new vm.SyntheticModule(["default"], function () { this.setExport("default", db); }, { context });
    const crypto = new vm.SyntheticModule(["randomBytes", "createHash"], function () {
        this.setExport("randomBytes", randomBytes); this.setExport("createHash", createHash);
    }, { context });
    async function load(url) {
        if (url.endsWith("/db.cjs")) return database;
        if (modules.has(url)) return modules.get(url);
        const mod = new vm.SourceTextModule(await readFile(new URL(url), "utf8"), { context, identifier: url });
        modules.set(url, mod);
        await mod.link((specifier, parent) => ["crypto", "node:crypto"].includes(specifier) ? crypto : load(new URL(specifier, parent.identifier).href));
        return mod;
    }
    const serviceModule = await load(new URL("../../src/services/shareInvitationService.js", import.meta.url).href);
    await serviceModule.evaluate();
    return { service: serviceModule.namespace.createInvitationService(db), db, state: () => state };
}
