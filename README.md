# ITS132-PROJECT-LAW$
use vs-code to edit

# first time setup as a dev 
open terminal
```
cd mern/server
npm install mongodb express cors
```
open a second terminal
```
cd mern/client
npm create vite@latest client – –template react
```
choose react
choose typescript
```
npm install
```


## How to Edit
mern/server/routes
database handling files

mern/server/server.js
if you're adding more files to handle database, make sure to integrate in server.js

mern/client/src
frontend stuff, should be self-explanatory

## How To Run
Create the file `mern/server/config.env` with your Atlas URI and the server port:
fill in `<username>` and `<password>`
```
ATLAS_URI=mongodb+srv://<username>:<password>@learningcluster.mofbttf.mongodb.net/employees?retryWrites=true&w=majority 
PORT=5050
```

Start server:
```
cd mern/server
node --env-file=config.env server
```

Start Web server
```
cd mern/client
npm run dev
```

