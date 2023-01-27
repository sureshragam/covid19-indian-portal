const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

let db = null;
const dbPath = path.join("covid19IndiaPortal.db");

const authorize = (request, response, next) => {
  let token = request.headers["authorization"];

  if (token === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    let accessToken = token.split(" ");
    accessToken = accessToken[1];
    jwt.verify(accessToken, "im unique", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// get /login/

app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const userQuery = `
        SELECT *
        FROM user
        WHERE username = '${username}'
        `;
    const userDetails = await db.get(userQuery);
    // console.log(userDetails);
    if (userDetails === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isValidUser = await bcrypt.compare(password, userDetails.password);
      //   console.log(isValidUser);
      if (isValidUser) {
        const payload = userDetails.username;
        const jwtToken = jwt.sign(payload, "im unique");
        response.send({
          jwtToken: `${jwtToken}`,
        });
        console.log(jwtToken);
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (e) {
    console.log(e.message);
  }
});

// get /states/

app.get("/states/", authorize, async (request, response) => {
  try {
    const statesQuery = `
        SELECT state_id AS stateId,
        state_name AS stateName,
        population
        FROM state
        `;
    const stateDetails = await db.all(statesQuery);
    response.send(stateDetails);
  } catch (e) {
    console.log(e.message);
  }
});

// get /states/:stateId/

app.get("/states/:stateId/", authorize, async (request, response) => {
  {
    const { stateId } = request.params;
    try {
      const stateQuery = `
        SELECT state_id AS stateId,
        state_name AS stateName,
        population
        FROM state
        WHERE state_id = '${stateId}'
        `;
      const stateDetails = await db.get(stateQuery);
      response.send(stateDetails);
    } catch (e) {
      console.log(e.message);
    }
  }
});

//  post /districts/

app.post("/districts/", authorize, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  try {
    const addDistrictQuery = `
        INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
        VALUES(
            '${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths}
        )
        `;
    await db.run(addDistrictQuery);
    response.send("District Successfully Added");
  } catch (e) {
    console.log(e.message);
  }
});

// get /districts/:districtsId/

app.get("/districts/:districtId/", authorize, async (request, response) => {
  const { districtId } = request.params;
  try {
    const districtQuery = `
        SELECT district_id AS districtId,
        district_name AS districtName,
        state_id AS stateId,
        cases,cured,active,deaths
        FROM district
        WHERE district_id = '${districtId}'
        `;
    const districtDetails = await db.get(districtQuery);
    response.send(districtDetails);
  } catch (e) {
    console.log(e.message);
  }
});

// delete /districts/:districtId/

app.delete("/districts/:districtId/", authorize, async (request, response) => {
  const { districtId } = request.params;
  try {
    const deleteDistrictQuery = `
        DELETE
        FROM district
        WHERE district_id = '${districtId}'
        `;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  } catch (e) {
    console.log(e.message);
  }
});

// put /districts/:districtId/

app.put("/districts/:districtId/", authorize, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  try {
    const updateDistrictQuery = `
        UPDATE district
        SET
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        `;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  } catch (e) {
    console.log(e.message);
  }
});

// get /states/:stateId/stats/
app.get("/states/:stateId/stats/", authorize, async (request, response) => {
  const { stateId } = request.params;
  try {
    const statesStatsQuery = `
        SELECT SUM(cases) AS totalCases,
        SUM(cured)AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths 
        FROM district
        WHERE state_id = ${stateId};
        `;
    const stateStatsDetails = await db.get(statesStatsQuery);
    response.send(stateStatsDetails);
  } catch (e) {
    console.log(e.message);
  }
});

const initializeSeverAndConnectDataBase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started at http://localhost:3000");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeSeverAndConnectDataBase();

module.exports = app;
