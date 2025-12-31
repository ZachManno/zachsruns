
Overview:
This app is very lightweight and hosted completed in vercel - there are tech requirements later on after these feature requirements. The expected user base is less than 40 people, so simplicity is key. The web app will be called "Zach's Runs". "Runs" are what people in the basketball community call a set time for a pickup game. I am Zach and I organize the runs. The people are becoming more, and there are more runs as well. Example of a run:

Date: Tuesday January 6th Run
Time: 7-9pm
Location: Phield House (with address)
Confirmed: Alec, Zach, Allen, etc
Interested: Steve, Mike
Out: AJ, Jim

Now from this, you can see it is basically an event organizer app, but there will be some other features added on as well. As far as basic functionality: 

- Basketball theming throughout - not the clip art basketball theme but just sleek orange/black/wood tailwind color design. 
- Home page is titled "Zachs Runs"
	- A home page has tiles displaying the currently scheduled runs and the participants
	- Home page also allows a banner at the top for Admin Announcements
- A standard user CRUD system, with Signup/Login buttons and an authorization flow. Then within the users Profile tab, there will be a "My Runs" display with the runs they signed up for, as well as a history of the previous runs they had attended. 
	- Users will also have a verified and unverified badge, earned only by admin verification
- There will be one admin login, already premade with the username zmann and password basketball. The admin has to have an admin page that allows them to create new runs, verify users, and send announcements.
    - The admin also needs a page to be able to input data from all the previous runs that happened before this web app was built. 


Tech stack:
- Vercel Deployed full stack app
- Frontend: NextJs with Typescript, tailwind css, modern feel but simple
- Backend: Flask app (Vercel hosted) with Vercel postgress
- Requirements: There will be under 40 users, and very less traffic. Each user can have simple CRUD operations on their account. Users will have a login with password. There will also be an admin page with a predefined login and password. 
- This is a very lightweight app with under 40 users, build with simplicity in mind
- Do not take any steps to deploy the app to vercel yet, just write the project and I will do these steps later, Id like it running just on localhost:3000

