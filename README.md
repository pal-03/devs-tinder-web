# Current Setup

- Node.js: 24.14.1 (development and EC2).
- Frontend: `npm install`, then `npm run dev` at `http://localhost:5173`.
- Backend: run `npm run start:local` in the backend repository for a temporary local database. Email and cron are disabled in this mode, and data is lost when the process stops.
- For Atlas, configure the backend `.env` from `.env.example` and use `npm start`. The cluster must be resumed, and the backend's outgoing public IP must be in the Atlas access list.

## Verification

- `npm run lint` and `npm run build` check the frontend.
- `npm run test:e2e` runs Playwright against an isolated database with email disabled. The sibling backend path can be overridden with `DEVTINDER_BACKEND_DIR`.
- Run `npx playwright install chromium` once if the browser binary is missing.
- `npm test` in the backend repository runs its API and email regression tests.
- `npm run test:e2e -- --live` verifies `https://devs-tinder.in`. Set `E2E_SSH_KEY` to the existing EC2 key path. Set `E2E_REMOTE_BACKEND_DIR` only when verifying a staged backend release.
- Live tests create up to 16 uniquely named synthetic accounts, exclude real profiles from their feeds, and remove only that run's accounts and requests afterward. Disable outbound email and cron during the live run. No payment is submitted.
- Screenshots and reports are written under ignored `artifacts/` directories.

## Production Recovery

- The backend must run under PM2 as `devTinder-backend` on port 7777. Nginx forwards `/api/` to `http://127.0.0.1:7777/`.
- PM2's process list must be saved and the `pm2-ubuntu` systemd service enabled so the backend returns after a reboot.
- Verify `https://devs-tinder.in/api/health` returns 200. Health checks include a database ping and return 503 if Atlas is unavailable.
- Payment gateway integration currently exists only in the learning notes; no payment UI or backend API has been implemented.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# DevTinder

- Create a Vite + React application
- Remove unecessary code and create a Hello World app
- Install Tailwind CSS
- Install Daisy UI
- Add NavBar component to App.jsx

- Create a NavBar.jsx separate Component file
- Install react router dom
- Create BrowserRouter > Routes > Route=/ Body > RouteChildren
- Create an Outlet in your Body Component
- Create a footer
- Create a Login Page
- Install axios
- CORS - install cors in backend => add middleware to with configurations: orgin, credentials: true
- Whenever you're making API call so pass axios => { withCredentials: true }
- install react-redux + @reduxjs/toolkit - https://redux-toolkit.js.org/tutorials/quick-start
- configureStore => Provider => createSlice => add reducer to store
- Add redux devtools in chrome
- Login and see if your data is coming properly in the store
- NavBar should update as soon as user logs in
- Refactor our code to add constants file + create a components folder
- You should not be access other routes without login
- If token is not present, redirect user to login page

- Logout Feature
- Get the feed and add the feed in th store
- build the user card on feed
- Edit Profile Feature
- Show Toast Message on save of profile
- See all my connections
- New Page - See all my connections
- New Page - See all my Conenction REquests
- Feature - Accept/Reject connection request
- Send/Ignore the user card from the feed

Remaining: 
- Signup New User 
- E2E testing

Body 
    NavBar
    Route=/  => Feed
    Route=/login  => Login
    Route=/connetions => Connections
    Router=/profile => Profile


     # Deployment

    - Signup on AWS 
    - Launch instance
    - chmod 400 <secret>.pem
    - ssh -i "devTinder-secret.pem" ubuntu@ec2-43-204-96-49.ap-south-1.compute.amazonaws.com
    - Install Node version 16.17.0
    - Git clone
    - Frontend    
        - npm install  -> dependencies install
        - npm run build
        - sudo apt update
        - sudo apt install nginx
        - sudo systemctl start nginx
        - sudo systemctl enable nginx
        - Copy code from dist(build files) to /var/www/html/
        - sudo scp -r dist/* /var/www/html/
        - Enable port :80 of your instance
    - Backend
        - updated DB password
        - allowed ec2 instance public IP on mongodb server
        - npm intsall pm2 -g
        - pm2 start npm --name "devTinder-backend" -- start
        - pm2 logs
        - pm2 list, pm2 flush <name> , pm2 stop <name>, pm2 delete <name>
        - config nginx - /etc/nginx/sites-available/default
        - restart nginx - sudo systemctl restart nginx
        - Modify the BASEURL in frontend project to "/api"



# Ngxinx config: 

        Frontend = http://43.204.96.49/
        Backend = http://43.204.96.49:7777/
    
        Domain name = devtinder.com => 43.204.96.49

        Frontend = devtinder.com
        Backend = devtinder.com:7777 => devtinder.com/api

        nginx config : 

        server_name 43.204.96.49;

        location /api/ {
            proxy_pass http://localhost:7777/;  # Pass the request to the Node.js app
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }


# Addding a custom Domain name

    - purchased domain name from godaddy
    - signup on cloudflare & add a new domain name
    - change the nameservers on godaddy and point it to cloudflare
    - wait for sometime till your nameservers are updated ~15 minutes
    - DNS record: A devtinder.in 3.104.38.33
    - Enable SSL for website 


# Sending Emails via SES

    - Create a IAM user
    - Give Access to AmazonSESFullAccess
    - Amazon SES: Create an Identity
    - Verify your domain name
    - Verify an email address identity
    - Install AWS SDK - v3 
    - Code Example https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/javascriptv3/example_code/ses#code-examples
    - Setup SesClient
    - Access Credentials should be created in IAm under SecurityCredentials Tab
    - Add the credentials to the env file
    - Write code for SESClient
    - Write code for Sending email address
    - Make the email dynamic by passing more params to the run function

# Scheduling cron jobs in NodeJS
    - Installing node-cron
    - Learning about cron expressions syntax - crontab.guru
    - Schedule a job
    - date-fns
    - Find all the unique  email Id who have got connection Request in previous day
    - Send Email
    - Explore queue mechanim to send bulk emails
    - Amazon SES Bulk Emails
    - Make sendEmail function dynamic
    - bee-queue & bull npm packages
