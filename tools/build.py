#!/usr/bin/env python3
"""
Syncr site generator.

Stamps shared <head> SEO, nav, and footer onto per-page content partials and
writes plain static HTML to the site root. The DEPLOYED site stays a
zero-dependency static bundle — this generator is a dev convenience only.

Usage:
    python3 tools/build.py            # build all pages + sitemap + robots
    python3 tools/build.py --check    # build, then print a link/asset report

Change the domain in ONE place: SITE["origin"] below (or run tools/set-domain.sh).
"""
import os
import re
import sys
import glob
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTIALS = os.path.join(ROOT, "tools", "partials")

# ----------------------------------------------------------------------------
# ONE place to change the deployment domain. No trailing slash.
# ----------------------------------------------------------------------------
SITE = {
    "origin":    "https://syncr.taymaerz.de",
    "name":      "Syncr",
    "tagline":   "Discord Rich Presence for Firefox",
    "repo":      "Clawb1t/Syncr",
    "site_repo": "taynotfound/syncr-site",
    "author":    "ClawB1t",
    "og_image":  "/assets/og.png",
    "twitter":   "",
    "locale":    "en_US",
}
TODAY = datetime.date.today().isoformat()

# ----------------------------------------------------------------------------
# Activity data (real, pulled from the Syncr repo metadata).
# ----------------------------------------------------------------------------
ACTIVITIES = [
    {
        "id": "youtube-music", "name": "YouTube Music", "logo": "youtube-music.svg",
        "badge": "Listening", "badge_class": "listen", "category": "Music",
        "verb": "Listening to", "site": "music.youtube.com", "button": "Listen on YouTube Music",
        "tagline": "Now playing, live on your Discord profile.",
        "desc": "Syncr shows the track you are playing on YouTube Music with artist, album "
                "artwork, and a live progress bar, right on your Discord profile.",
        "shows": ["Track title", "Artist", "Album artwork", "Live progress bar"],
        "shipped": "1.0.3 era", "scraper": "remote",
    },
    {
        "id": "youtube", "name": "YouTube", "logo": "youtube.svg",
        "badge": "Watching", "badge_class": "watch", "category": "Video",
        "verb": "Watching", "site": "youtube.com", "button": "Watch on YouTube",
        "tagline": "The video you are watching, on Discord.",
        "desc": "Syncr shows the YouTube video you are watching, with its title and channel, "
                "on your Discord profile. It clears the moment you close the tab.",
        "shows": ["Video title", "Channel name"],
        "shipped": "1.0.3 era", "scraper": "remote",
    },
    {
        "id": "reddit", "name": "Reddit", "logo": "reddit.svg",
        "badge": "Browsing", "badge_class": "watch", "category": "Social",
        "verb": "Browsing", "site": "reddit.com", "button": "View on Reddit",
        "tagline": "What you are reading on Reddit.",
        "desc": "Syncr shows the Reddit post or subreddit you are on, or a simple browsing "
                "status, on your Discord profile. Works on www and old Reddit.",
        "shows": ["Post title", "Subreddit", "Author, score, comments", "Or a browsing status"],
        "shipped": "1.0.9", "scraper": "remote",
    },
    {
        "id": "proton-mail", "name": "Proton Mail", "logo": "proton-mail.svg",
        "badge": "Privacy-first", "badge_class": "priv", "category": "Productivity",
        "verb": "Watching", "site": "mail.proton.me", "button": "Open Proton Mail",
        "tagline": "A deliberately generic mail status.",
        "desc": "Syncr shows a generic checking-mail status for Proton Mail. No subjects, no "
                "senders, no message bodies. Privacy is the whole point.",
        "shows": ["Generic mail status only", "No subjects", "No senders", "No personal data"],
        "shipped": "1.0.11", "scraper": "remote",
    },
    {
        "id": "netflix", "name": "Netflix", "logo": "netflix.png",
        "badge": "Watching", "badge_class": "watch", "category": "Streaming",
        "verb": "Watching", "site": "netflix.com", "button": "Watch on Netflix",
        "tagline": "The show or film you are watching.",
        "desc": "Syncr shows what you are watching on Netflix, with season and episode, artwork, "
                "pause state, and a progress bar, on your Discord profile.",
        "shows": ["Title", "Season and episode", "Artwork", "Pause state and progress"],
        "shipped": "1.0.12", "scraper": "remote",
    },
]

# ----------------------------------------------------------------------------
# Static page registry. Per-activity pages are appended programmatically below.
# ----------------------------------------------------------------------------
PAGES = [
    {
        "out": "index.html", "partial": "home.html", "url": "/",
        "title": "Syncr, Discord Rich Presence for Firefox",
        "desc": "Syncr puts what you are doing on the web onto your Discord profile. Free, "
                "open source, and fully local. No login, no paywall, no ads.",
        "prio": "1.0", "freq": "weekly", "nav": "home", "kind": "WebPage",
    },
    {
        "out": "activities/index.html", "partial": "activities.html", "url": "/activities/",
        "title": "Supported Activities, Syncr for Firefox",
        "desc": "Every site Syncr can show on your Discord profile: YouTube Music, YouTube, "
                "Reddit, Proton Mail, and Netflix. Each reads only what it needs.",
        "prio": "0.9", "freq": "weekly", "nav": "activities", "kind": "CollectionPage",
    },
    {
        "out": "download.html", "partial": "download.html", "url": "/download.html",
        "title": "Download Syncr, Free Discord Rich Presence for Firefox",
        "desc": "Install Syncr for Firefox in a minute. Free and open source, with a built-in "
                "updater. Grab the latest signed release and go live on Discord.",
        "prio": "0.9", "freq": "weekly", "nav": "download", "kind": "WebPage",
    },
    {
        "out": "changelog.html", "partial": "changelog.html", "url": "/changelog.html",
        "title": "Changelog, Syncr for Firefox",
        "desc": "Full version history for the Syncr extension and native host, pulled live from "
                "the GitHub repository.",
        "prio": "0.6", "freq": "weekly", "nav": "changelog", "kind": "WebPage",
    },
    {
        "out": "faq.html", "partial": "faq.html", "url": "/faq.html",
        "title": "FAQ, Syncr Discord Rich Presence for Firefox",
        "desc": "Answers about Syncr: how it works, privacy, Discord login, PreMiD differences, "
                "supported sites, and troubleshooting.",
        "prio": "0.7", "freq": "monthly", "nav": "faq", "kind": "FAQPage",
    },
]
for a in ACTIVITIES:
    PAGES.append({
        "out": "activities/{}.html".format(a["id"]), "partial": "_activity.html",
        "url": "/activities/{}.html".format(a["id"]),
        "title": "{} on Discord with Syncr, Firefox Rich Presence".format(a["name"]),
        "desc": a["desc"], "prio": "0.7", "freq": "monthly",
        "nav": "activities", "kind": "WebPage", "activity": a,
    })


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _unescape(s):
    return (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            .replace("&quot;", '"').replace("&hellip;", "\u2026").replace("&middot;", "\u00b7")
            .replace("&auml;", "\u00e4").replace("&euro;", "\u20ac").replace("&rarr;", "\u2192")
            .replace("&larr;", "\u2190").replace("&amp;", "&"))


def extract_faq(html):
    """Pull (question, answer) pairs out of the FAQ partial so the FAQPage
    JSON-LD stays a single source of truth with the visible HTML."""
    pairs = []
    for m in re.finditer(
            r"<summary>(.*?)</summary>\s*<div class=\"faq-a\">(.*?)</div>",
            html, re.S):
        q = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        a = re.sub(r"<[^>]+>", " ", m.group(2))
        a = re.sub(r"\s+", " ", a).strip()
        if q and a:
            pairs.append((_unescape(q), _unescape(a)))
    return pairs


def read_partial(name):
    with open(os.path.join(PARTIALS, name), "r", encoding="utf-8") as f:
        return f.read()


def nav_html(active):
    items = [
        ("home", "/", "Home"),
        ("activities", "/activities/", "Activities"),
        ("download", "/download.html", "Download"),
        ("changelog", "/changelog.html", "Changelog"),
        ("faq", "/faq.html", "FAQ"),
    ]
    links = "\n".join(
        '        <a href="{href}"{cls}>{label}</a>'.format(
            href=h, label=l, cls=' class="active"' if k == active else "")
        for k, h, l in items
    )
    return read_partial("_nav.html").replace("{{LINKS}}", links)


def footer_html():
    return read_partial("_footer.html").replace("{{YEAR}}", str(datetime.date.today().year))


def json_ld(page):
    origin = SITE["origin"]
    org = {
        "@type": "Organization", "name": "Syncr",
        "url": origin + "/", "logo": origin + "/assets/syncrlogo.png",
    }
    graph = [{
        "@type": "WebSite", "name": "Syncr", "url": origin + "/",
        "description": PAGES[0]["desc"],
        "potentialAction": {
            "@type": "SearchAction",
            "target": origin + "/activities/?q={search_term_string}",
            "query-input": "required name=search_term_string",
        },
    }]
    app = {
        "@type": "SoftwareApplication", "name": "Syncr",
        "applicationCategory": "BrowserApplication",
        "operatingSystem": "Firefox (Windows, macOS, Linux)",
        "description": PAGES[0]["desc"], "url": origin + "/",
        "downloadUrl": "https://github.com/{}/releases".format(SITE["repo"]),
        "softwareVersion": "{{LATEST_VERSION}}",
        "author": org,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "license": "https://github.com/{}/blob/main/LICENSE".format(SITE["repo"]),
    }
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": origin + "/"}]
    if page["url"] not in ("/",):
        parts = [p for p in page["url"].strip("/").split("/") if p]
        acc = origin
        for i, p in enumerate(parts, start=2):
            acc += "/" + p
            label = page["title"].split(",")[0] if i == len(parts) + 1 else p.replace("-", " ").replace(".html", "").title()
            crumbs.append({"@type": "ListItem", "position": i, "name": label, "item": acc})
    breadcrumb = {"@type": "BreadcrumbList", "itemListElement": crumbs}

    graph.append(app)
    graph.append(breadcrumb)
    if page.get("kind") == "CollectionPage":
        graph.append({
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1,
                 "url": origin + "/activities/{}.html".format(a["id"]), "name": a["name"]}
                for i, a in enumerate(ACTIVITIES)
            ],
        })
    if page.get("kind") == "FAQPage":
        qa = extract_faq(read_partial(page["partial"]))
        if qa:
            graph.append({
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": q,
                     "acceptedAnswer": {"@type": "Answer", "text": a}}
                    for q, a in qa
                ],
            })
    if page.get("activity"):
        a = page["activity"]
        graph.append({
            "@type": "WebApplication", "name": "Syncr, {} activity".format(a["name"]),
            "applicationCategory": "BrowserApplication",
            "operatingSystem": "Firefox", "description": a["desc"],
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "url": origin + page["url"],
        })
    import json as _json
    doc = {"@context": "https://schema.org", "@graph": graph}
    return _json.dumps(doc, ensure_ascii=False, indent=None)


def head_html(page):
    origin = SITE["origin"]
    canonical = origin + ("/" if page["url"] == "/" else page["url"])
    og_img = origin + SITE["og_image"]
    tw = '\n  <meta name="twitter:site" content="{}" />'.format(esc(SITE["twitter"])) if SITE["twitter"] else ""
    tmpl = read_partial("_head.html")
    repl = {
        "{{TITLE}}": esc(page["title"]),
        "{{DESC}}": esc(page["desc"]),
        "{{CANONICAL}}": esc(canonical),
        "{{OG_IMAGE}}": esc(og_img),
        "{{OG_TYPE}}": "website",
        "{{URL}}": esc(canonical),
        "{{SITE_NAME}}": SITE["name"],
        "{{LOCALE}}": SITE["locale"],
        "{{TWITTER_SITE}}": tw,
        "{{JSONLD}}": json_ld(page),
        "{{DEPTH}}": "../" if "/" in page["out"] else "",
    }
    for k, v in repl.items():
        tmpl = tmpl.replace(k, v)
    return tmpl


def score_related(a, candidate):
    """Score how related `candidate` is to activity `a`. Higher = more related."""
    score = 0
    # Same category is the strongest signal
    if candidate['category'] == a['category']:
        score += 4
    # Same presence type (listening/watching/browsing)
    if candidate.get('badge_class') == a.get('badge_class'):
        score += 2
    # Semantic clusters — activities that belong to the same real-world domain
    CLUSTERS = {
        'music':       {'youtube-music', 'spotify', 'soundcloud', 'youtube', 'deezer',
                        'tidal', 'apple-music', 'bandcamp', 'reboot-radio'},
        'streaming':   {'netflix', 'disney-plus', 'max', 'hulu', 'crunchyroll', 'plex',
                        'mubi', 'vimeo', 'twitch', 'kick', 'youtube', 'amazon'},
        'social':      {'reddit', 'x', 'bluesky', 'threads', 'tumblr', 'mastodon',
                        'instagram', 'facebook', 'linkedin', 'pinterest', 'deviantart',
                        'pixiv', 'artstation', 'behance', 'dribbble', 'letterboxd',
                        'goodreads', 'ao3', 'medium', 'substack', 'hackernews', 'tiktok'},
        'coding':      {'github', 'gitlab', 'codeberg', 'forgejo', 'bitbucket', 'replit',
                        'codepen', 'stackoverflow', 'npm', 'linear', 'jira', 'trello',
                        'miro', 'excalidraw', 'monday', 'dsyncr'},
        'ai':          {'chatgpt', 'claude', 'grok', 'perplexity', 'gemini', 'ms-copilot',
                        'mistral', 'character-ai', 'poe', 'mapify'},
        'productivity':{'proton-mail', 'gmail', 'outlook', 'm365', 'notion', 'figma',
                        'canva', 'google-drive', 'google-docs', 'google-meet', 'slack',
                        'teams', 'dropbox', 'patreon'},
        'messaging':   {'discord', 'whatsapp', 'telegram', 'snapchat', 'element',
                        'revolt', 'guilded', 'rocket-chat', 'wamellow'},
        'gaming':      {'steam', 'chess-com', 'lichess', 'itch-io', 'roblox', 'geforcenow',
                        'twitch', 'kick'},
        'search':      {'google', 'duckduckgo', 'startpage', 'wikipedia', 'hackernews'},
        'learning':    {'duolingo', 'khanacademy', 'coursera', 'freecodecamp',
                        'stackoverflow', 'wikipedia'},
    }
    a_clusters   = {k for k, ids in CLUSTERS.items() if a['id']         in ids}
    cand_clusters = {k for k, ids in CLUSTERS.items() if candidate['id'] in ids}
    shared = a_clusters & cand_clusters
    score += len(shared) * 3
    return score


def render_activity(page):
    a = page["activity"]
    body = read_partial("_activity.html")
    shows = "\n".join(
        '          <li>{}</li>'.format(esc(s)) for s in a["shows"])
    others = [x for x in ACTIVITIES if x["id"] != a["id"]]
    # Score and sort by relevance — same category, same presence type, shared cluster
    others.sort(key=lambda x: score_related(a, x), reverse=True)
    others = others[:6]  # top 6 most related
    rel = "\n".join(
        '        <a class="rel-card" href="/activities/{id}.html">'
        '<span class="rel-logo"><img src="/assets/activities/{logo}" alt="{name}" loading="lazy" /></span>'
        '<span><span class="rel-name">{name}</span><span class="rel-cat">{cat}</span></span></a>'.format(
            id=x["id"], logo=x["logo"], name=esc(x["name"]), cat=esc(x["category"]))
        for x in others)
    repl = {
        "{{ID}}": a["id"], "{{NAME}}": esc(a["name"]), "{{LOGO}}": a["logo"],
        "{{BADGE}}": esc(a["badge"]), "{{BADGE_CLASS}}": a["badge_class"],
        "{{CATEGORY}}": esc(a["category"]), "{{VERB}}": esc(a["verb"]),
        "{{SITE}}": esc(a["site"]), "{{BUTTON}}": esc(a["button"]),
        "{{TAGLINE}}": esc(a["tagline"]), "{{DESC}}": esc(a["desc"]),
        "{{SHIPPED}}": esc(a["shipped"]), "{{SCRAPER}}": esc(a["scraper"]),
        "{{SHOWS}}": shows, "{{RELATED}}": rel,
    }
    for k, v in repl.items():
        body = body.replace(k, v)
    return body


def build_page(page):
    if page["partial"] == "_activity.html":
        content = render_activity(page)
    else:
        content = read_partial(page["partial"])
    html = read_partial("_shell.html")
    html = (html
            .replace("{{HEAD}}", head_html(page))
            .replace("{{NAV}}", nav_html(page["nav"]))
            .replace("{{CONTENT}}", content)
            .replace("{{FOOTER}}", footer_html())
            .replace("{{DEPTH}}", "../" if "/" in page["out"] else ""))
    out_path = os.path.join(ROOT, page["out"])
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return page["out"]


def build_sitemap():
    origin = SITE["origin"]
    urls = []
    for p in PAGES:
        loc = origin + ("/" if p["url"] == "/" else p["url"])
        urls.append(
            "  <url>\n    <loc>{loc}</loc>\n    <lastmod>{mod}</lastmod>\n"
            "    <changefreq>{f}</changefreq>\n    <priority>{pr}</priority>\n  </url>".format(
                loc=esc(loc), mod=TODAY, f=p["freq"], pr=p["prio"]))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(urls) + "\n</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)

    robots = ("User-agent: *\nAllow: /\n\nSitemap: {}/sitemap.xml\n".format(origin))
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)


def check():
    problems = []
    hrefs = set()
    for p in PAGES:
        path = os.path.join(ROOT, p["out"])
        with open(path, encoding="utf-8") as f:
            html = f.read()
        for m in re.finditer(r'(?:href|src)="(/[^"]*)"', html):
            hrefs.add(m.group(1))
    for h in sorted(hrefs):
        clean = h.split("#")[0].split("?")[0]
        if clean in ("/",):
            target = "index.html"
        elif clean.endswith("/"):
            target = clean.strip("/") + "/index.html"
        else:
            target = clean.lstrip("/")
        fp = os.path.join(ROOT, target)
        if not os.path.exists(fp):
            problems.append("MISSING: {} -> {}".format(h, target))
    print("Local root-relative targets checked: {}".format(len(hrefs)))
    if problems:
        print("\n".join(problems))
    else:
        print("All local links resolve to files. OK")


def main():
    built = [build_page(p) for p in PAGES]
    build_sitemap()
    print("Built {} pages:".format(len(built)))
    for b in built:
        print("  " + b)
    print("Wrote sitemap.xml, robots.txt")
    if "--check" in sys.argv:
        print("---")
        check()


if __name__ == "__main__":
    main()
