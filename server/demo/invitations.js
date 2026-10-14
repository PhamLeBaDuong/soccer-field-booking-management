// Local-only demo: actual invitation/lobby/match services with sample data.
// No live database, environment files, or outbound account operations.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { invitationFixture } from "../test/helpers/invitationFixture.js";

const app = await invitationFixture();
const users = [
    { id: "owner", username: "owner", name: "Team Owner", email: "owner@example.test", password: "demo123", role: "player" },
    { id: "player", username: "player", name: "Demo Player", email: "player@example.test", password: "demo123", role: "player" },
];
const links = {};
app.state().posts.push({ ...app.state().posts[0], id: "new-team-post", preferredStartTime: new Date("2099-10-14T15:30Z"), preferredEndTime: new Date("2099-10-14T17:00Z") });
app.state().posts.push({ ...app.state().posts[0], id: "cancel-post", preferredStartTime: new Date("2099-10-15T15:30Z"), preferredEndTime: new Date("2099-10-15T17:00Z") });
for (const [kind, targetId] of [["team", "team"], ["match", "post"], ["lobby", "lobby"]]) {
    links[kind] = await app.service.create(kind, targetId, "owner");
}
links.newTeamMatch = await app.service.create("match", "new-team-post", "owner");
app.state().posts.push({ ...app.state().posts[0], id: "closed-post", status: "canceled" });
links.closed = await app.service.create("match", "closed-post", "owner");
const declined = await app.service.create("team", "team", "owner");
links.decline = declined;
const tokenFor = user => ["demo", Buffer.from(JSON.stringify({ id: user.id, name: user.name, username: user.username, role: user.role })).toString("base64url"), "demo"].join(".");
const publicUser = ({ password, ...user }) => user;
const demoTeam = team => ({ ...team,
    leader: publicUser(users.find(user => user.id === team.leaderId) ?? { id: team.leaderId, name: "Team Owner" }),
    members: team.members.map(member => ({ ...member,
        user: publicUser(users.find(user => user.id === member.userId) ?? { id: member.userId, name: "Player" }) })),
});
const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3100");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
    try {
        const url = new URL(req.url, "http://localhost:5055");
        let text = ""; for await (const chunk of req) text += chunk;
        const body = text ? JSON.parse(text) : {};
        let user;
        try { user = users.find(user => user.id === JSON.parse(Buffer.from(req.headers.authorization?.split(".")[1] ?? "", "base64url").toString()).id); } catch {}
        if (url.pathname === "/demo") {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitation demo</title><style>body{font:17px system-ui;max-width:650px;margin:60px auto;padding:20px}li{margin:18px 0}</style><h1>PitchBook invitation demo</h1><p>Isolated sample data. Your remote database is untouched.</p><p>Log in as <b>player</b> with password <b>demo123</b>, or register a new account.</p><ul>${Object.entries(links).map(([kind, invite]) => `<li><a href="http://localhost:3100/invite/${invite.token}">${kind} invitation</a></li>`).join("")}</ul><p>Owners can create/revoke links: log in as <b>owner / demo123</b> and visit <a href="http://localhost:3100/teams">Teams</a>.</p></html>`);
            return;
        }
        if (url.pathname === "/demo/links") return send(Object.fromEntries(Object.entries(links).map(([key, value]) => [key, `http://localhost:3100/invite/${value.token}`])));
        if (url.pathname === "/api/auth/register" && req.method === "POST") {
            if (users.some(user => user.username === body.username || user.email === body.email)) return send({ error: "Account already exists" }, 400);
            const created = { ...body, id: `user-${users.length}`, role: "player" }; users.push(created); return send(publicUser(created), 201);
        }
        if (url.pathname === "/api/auth/login") {
            const found = users.find(user => (user.username === body.username || user.email === body.email) && user.password === body.password);
            return found ? send({ token: tokenFor(found), user: publicUser(found) }) : send({ error: "This demo uses separate accounts. Use player / demo123 or owner / demo123, or register a sample account." }, 401);
        }
        const match = url.pathname.match(/^\/api\/invites\/links\/([a-f0-9]{64})(?:\/(mine|respond))?$/);
        if (match && req.method === "GET" && !match[2]) return send(await app.service.read(match[1]));
        if (!user) return send({ error: "Sign in first" }, 401);
        if (url.pathname === "/api/auth/me") return send(publicUser(user));
        if (url.pathname.startsWith("/api/invites/team-link/")) return send(await app.service.teamLink(url.pathname.split("/").at(-1), user.id));
        const resource = url.pathname.match(/^\/api\/invites\/resource-link\/(team|match|lobby)\/([^/]+)$/);
        if (resource) return send(await app.service.resourceLink(resource[1], resource[2], user.id));
        if (match && req.method === "GET") return send(await app.service.read(match[1], user.id));
        if (match && req.method === "POST") return send(await app.service.respond(match[1], user.id, body.decision, body));
        if (url.pathname === "/api/invites/links" && req.method === "POST") return send(await app.service.create(body.kind, body.targetId, user.id), 201);
        const managed = url.pathname.match(/^\/api\/invites\/links\/manage\/(team|match|lobby)\/([^/]+)$/);
        if (managed) return send(await app.service.list(managed[1], managed[2], user.id));
        if (url.pathname.startsWith("/api/invites/links/") && req.method === "DELETE") return send(await app.service.revoke(url.pathname.split("/").at(-1), user.id));
        if (url.pathname === "/api/teams/mine") return send(app.state().teams.filter(team => team.leaderId === user.id || team.members.some(member => member.userId === user.id)).map(demoTeam));
        if (url.pathname.startsWith("/api/teams/") && req.method === "GET") return send(demoTeam(await app.db.team.findUnique({ where: { id: url.pathname.split("/").at(-1) } })));
        if (url.pathname === "/api/teams" && req.method === "POST") {
            const team = { id: `team-${app.state().teams.length}`, name: body.name, size: body.size, leaderId: user.id, members: [{ userId: user.id, user: { id: user.id } }] };
            app.state().teams.push(team); return send(team, 201);
        }
        if (url.pathname === "/api/lobbies") return send(await app.db.lobby.findMany());
        if (url.pathname === "/api/match-posts" && req.method === "POST") return send(await app.matchPosts.createMatchPost({ ...body, requesterId: user.id }), 201);
        if (url.pathname === "/api/match-posts" && req.method === "GET") return send(await app.db.matchPost.findMany());
        if (url.pathname.startsWith("/api/fields/") && req.method === "GET") return send(await app.db.field.findUnique({}));
        const matchRequest = url.pathname.match(/^\/api\/match-posts\/([^/]+)$/);
        if (matchRequest && req.method === "DELETE") return send(await app.matchPosts.cancelMatchPost(matchRequest[1], user.id));
        if (url.pathname === "/api/bookings") return send(app.state().bookings.filter(booking => booking.userId === user.id));
        if (url.pathname === "/api/fields") return send([await app.db.field.findUnique({})]);
        if (url.pathname.endsWith("/mine") || url.pathname.startsWith("/api/friends")) return send([]);
        send({ error: "Demo route not found" }, 404);
    } catch (error) { send({ error: error.message }, error.status ?? 400); }
});
server.listen(5055, "127.0.0.1", () => {
    console.log("Invitation demo uses isolated sample data. Login: player / demo123 (or register a new account).");
    for (const [kind, invite] of Object.entries(links)) console.log(`${kind}: http://localhost:3100/invite/${invite.token}`);
});
let web;
if (!process.argv.includes("--api-only")) {
    const webDir = fileURLToPath(new URL("../../client/web/", import.meta.url));
    const nextCli = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
    web = spawn(process.execPath, [nextCli, "dev", "--port", "3100"], { cwd: webDir, stdio: "inherit", windowsHide: true,
        env: { ...process.env, NEXT_PUBLIC_API_URL: "http://localhost:5055", NEXT_PUBLIC_INVITATION_DEMO: "true", INVITATION_DEMO_DIST_DIR: ".next-invitation-demo" } });
    web.on("exit", () => server.close());
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { web?.kill(); server.close(() => process.exit()); });
