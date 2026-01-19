
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
- There will be one admin login, already premade with the username zmann. The admin password is set via environment variable (see README). The admin has to have an admin page that allows them to create new runs, verify users, and send announcements.
    - The admin also needs a page to be able to input data from all the previous runs that happened before this web app was built. 


Tech stack:
- Vercel Deployed full stack app
- Frontend: NextJs with Typescript, tailwind css, modern feel but simple
- Backend: Flask app (Vercel hosted) with Vercel postgress
- Requirements: There will be under 40 users, and very less traffic. Each user can have simple CRUD operations on their account. Users will have a login with password. There will also be an admin page with a predefined login and password. 
- This is a very lightweight app with under 40 users, build with simplicity in mind
- Do not take any steps to deploy the app to vercel yet, just write the project and I will do these steps later, Id like it running just on localhost:3000


What feature do you want to add? (e.g., notifications, run comments, player ratings, payment tracking)

For users, I want to add a new "badge" system to each user, where an icon is present next to their names. Design the icons yourself. The 3 badges are:

1. "VIP", this is someone who reliably and consistently shows up to most or all of the runs.
2. "Regular", lower tier than the VIP, but a consistent regular at the runs
3. "Rookie", someone who is in the run group and accepted, but with 2 runs or less
4. "+1", somebody who is referred by a Regular or VIP, but is not yet in the group

The badges are assigned directly by the admin, so the admin management page needs a feature to assign these. 

Based off this new info, I want to add a "Community" tab that lists all users out with their icons. Put groupings for each kind of user


Please ask any other clarifying questions on this


Badge assignment:
Should "Rookie" be automatically assigned based on run count (≤2 confirmed runs), or manually assigned by admin? - The admin will manually assign

For "+1", do we need a referral system to track who referred them, or is it admin-assigned only? - yes


Badge exclusivity:
Can a user have only one badge at a time, or multiple? - only 1 at a time

Badge display:
Where should badges appear? (e.g., next to names on run cards, profile pages, participant lists, Community page) - Anywhere a user is mentioned, for example on the participant list, it should say Zach(VIP Badge). On the user profile page, it should have a big icon at the top to signify, and at the community page, each user will be in a card/row and the icon will be there after their name. 


Community page:
Should it show all users or only verified users? - all users, but separate segment for unverified 

Any additional info per user (run count, join date, etc.)? - Run count

Should it be searchable/filterable? - yes

Badge icons:
Any style preferences (simple icons, emoji-style, custom SVG)? - emoji style

Color scheme to match the basketball theme? - yes

Admin interface:
Should badge assignment be on the existing "Verify Users" page, or a separate "Manage Badges" page? - A new manage badges page
Any bulk assignment options? - default all to Regular for now





Run completion process:
When admin "completes" a run, should all "confirmed" participants be marked as attended by default, or should the admin check each person individually? - admin has to check each individually
Should there be a separate "attended" status, or just mark confirmed users who didn't show as "no-show"? - just mark confirmed as no show

No-shows tracking:
Should no-shows be tracked as a separate count/stat for each user? - yes
Should no-shows be visible on user profiles or only to admins? - yes visible
What about users who were "interested" or "out" — do they count as no-shows if they didn't show up? - no

User stats:
What stats should be tracked? (e.g., total runs attended, no-shows count, attendance rate) - total runs attended, no-shows count, attendance rate
Should these stats be visible on the Community page or Profile page? - community and profile page

Run status:
After a run is "completed", should it be locked from editing, or can admins still modify it? - locked from editing
Should completed runs be visually distinct (different styling, moved to "Past Runs" section)? - Yes, there should be an "Upcoming Runs" like there is now, and then underneath it a "Past Runs" in the same style. With one more category in the "confirmed / interested / out" - No show

Manage Runs page:
Should it show all runs (upcoming + past) or just upcoming? - All runs, the admin will go to the run and update its status to "Complete"
What actions should be available? (Edit, Complete, Delete, View Details) - Edit, Complete, Delete, View Details
For completing a run, should there be a checklist/interface to mark who attended? - Yes, and a space to add any extra users (from a drop down) who attended but did not confirm via the web app

Run count calculation:
Should run count only include runs where the user was marked as "attended" (not just confirmed)? - only marked as attended
Should historical runs (imported) count toward run totals, or only runs completed through the app? - historical runs should count as well