# GetGud

Web app that matches esports athletes with therapists and mental performance coaches.
Real accounts (sign up, sign in, sign out, change password, delete account), a saved
questionnaire, ranked matches, a booking calendar, a dashboard, and a team-only results page.

## Live site

https://aayush6200.github.io/getgud/

This is the GitHub Pages build in `docs/`. It has every screen and the full matching logic.
Accounts, answers, and bookings are saved in the visitor's own browser, because GitHub Pages
cannot run a server. Rebuild it after changes with `site/build-static.sh`, then commit and push.

## Run the full server version on your laptop

    cd site
    npm install
    npm start          # http://localhost:3000

Data is stored in `data/getgud.db` (SQLite). Delete that folder to start clean.
Team results page: http://localhost:3000/team-log?key=getgud-team

## Optional: server version on AWS (shared accounts across devices, about $0)

    cd site
    aws sso login --profile aayush_admin
    ./deploy.sh aayush_admin

This creates one Lambda function with a public URL and one on-demand DynamoDB table.
Nothing runs when nobody is using the site, and class-project traffic sits inside the
AWS free allowances. The script prints the live URL and the team results link.
Run the same command again to ship changes. Remove everything with:

    aws cloudformation delete-stack --stack-name getgud --profile aayush_admin --region us-east-1

## Where things are (inside `site/`)

- `server.js`   routes, sign-in sessions, validation
- `views.js`    every page's HTML
- `store.js`    database code (SQLite locally, DynamoDB on AWS)
- `shared/gg.js` sample providers and the matching rules (used by server and browser)
- `public/`     styles and browser code for the questionnaire, matches, and booking screens
- `static/spa.js`, `build-static.sh`  the GitHub Pages build
- `infra/template.yaml`, `deploy.sh`, `lambda.js`  AWS setup

Passwords are stored as salted scrypt hashes. All providers are fictional samples.
