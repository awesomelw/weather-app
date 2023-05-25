const path = require("path");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const databaseAndCollection = { db: "FinalProject335", collection: "history" };
const { MongoClient, ServerApiVersion } = require('mongodb');
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const url = `mongodb+srv://${userName}:${password}@cluster0.urwnmp0.mongodb.net/?retryWrites=true&w=majority`;
const apiKey = '714fbbf190ec66c51b46116b4c7d3818';

if (process.argv.length != 3) {
  process.stdout.write("Include port number");
  process.exit(1);
}

const port = process.argv[2];
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.render("index");
})

app.get("/printDatabase", (req, res) => {
  async function main() {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
      await client.connect();
      const info = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find().toArray();
      let table = "<table border='1'><tr><th>Location</th><th>Temperature in &deg;F</th></tr>";
      info.forEach(obj => {
        table += `<tr><td>${obj.city}</td><td>${obj.temp}</td></tr>`;
      });
      table += "</table>";
      res.render("printDatabase", { table: table });
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

  }
  main().catch(console.error);
})

app.post("/", (req, res) => {
  let date = new Date(Date.now());
  let location = req.body.city;
  let temp = 0;

  let info = {
    date: date,
    city: location,
    temp: temp,
  };

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`)
    .then((response) => response.json())
    .then((data) => {
      temp = (Number(data.main.temp) - 273.15) * 9 / 5 + 32;
      temp = temp.toFixed(0);
      info.temp = temp; // Update the temp value in the info object
      res.render("result", { answer: temp });

      // Insert the info document into the MongoDB database
      const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
      client.connect()
        .then(() => client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(info))
        .catch((error) => console.error(error))
        .finally(() => client.close());
    })
    .catch((error) => {
      console.error(error);
      res.render("result", { error: "Failed to fetch weather data" });
    });
});

app.get("/remove", (req, res) => {
  async function main() {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
      await client.connect();
      const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).deleteMany({});
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }
  }

  res.render("remove");
  main().catch(console.error);
})

var mysql = require('mysql');
app.get("/mySQLDatabase", (req, res) => {
  res.render("mySQLDatabase");
})

app.post("/createSQLdb", (req, res) => {
  var con = mysql.createConnection({
    host: "127.0.0.1",
    port: "3306",
    user: "root",
    password: ""
  });

  con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    con.query("CREATE DATABASE IF NOT EXISTS mydb", function (err, result) {
      if (err) throw err;
      if (result.warningCount === 0) {
        console.log("Database created!");
      } else {
        console.log("Database already exists!");
      }

      con.query("USE mydb", function (err) {
        if (err) throw err;
        console.log("Using database: mydb");

        var sql = "CREATE TABLE IF NOT EXISTS weather (location VARCHAR(255), temperature VARCHAR(255), date VARCHAR(255))";
        con.query(sql, function (err, result) {
          if (err) throw err;
          if (result.warningCount === 0) {
            console.log("Table created!");
          } else {
            console.log("Table already exists!");
          }

          con.end(); // Close the connection after creating the table

          res.render("createSQLdb");
        });
      });
    });
  });
});

app.post("/addEntrySQLdb", (req, res) => {
  let date = new Date(Date.now());
  let location = req.body.city;
  let temp = 0;

  let info = {
    date: date,
    city: location,
    temp: temp,
  };

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`)
    .then((response) => response.json())
    .then((data) => {
      temp = (Number(data.main.temp) - 273.15) * 9 / 5 + 32;
      temp = temp.toFixed(0);
      info.temp = temp; // Update the temp value in the info object
      res.render("result", { answer: temp });

      // Insert the info document into the SQL database
      var con = mysql.createConnection({
        host: "127.0.0.1",
        port: "3306",
        user: "root",
        password: "",
        database: "mydb"
      });

      con.connect(function (err) {
        if (err) throw err;
        console.log("Connected to database: mydb");

        var sql = "INSERT INTO weather (location, temperature, date) VALUES (?, ?, ?)";
        var values = [info.city, info.temp, info.date];
        con.query(sql, values, function (err, result) {
          if (err) throw err;
          console.log("Inserted entry into weather table:", info);
        });

        con.end();
      });
    })
    .catch((error) => {
      console.error(error);
      res.render("result", { error: "Failed to fetch weather data" });
    });
});

app.post("/printSQLdb", (req, res) => {
  async function main() {
    var con = mysql.createConnection({
      host: "127.0.0.1",
      port: "3306",
      user: "root",
      password: "",
      database: "mydb"
    });

    con.connect(function (err) {
      if (err) throw err;
      console.log("Connected to database: mydb");

      var location = req.body.city;
      var sql = "SELECT * FROM weather WHERE location = ?";
      var values = [location];

      con.query(sql, values, function (err, result) {
        if (err) throw err;

        let table = "<table border='1'><tr><th>Location</th><th>Temperature in &deg;F</th><th>Date</th></tr>";
        result.forEach(obj => {
          table += `<tr><td>${obj.location}</td><td>${obj.temperature}</td><td>${obj.date}</td></tr>`;
        });
        table += "</table>";
        res.render("printDatabase", { table: table });

        con.end();
      });
    });
  }

  main().catch(console.error);
});

app.post("/updateSQLDatabase", (req, res) => {
  async function main() {
    var con = mysql.createConnection({
      host: "127.0.0.1",
      port: "3306",
      user: "root",
      password: "",
      database: "mydb"
    });

    con.connect(function (err) {
      if (err) throw err;
      console.log("Connected to database: mydb");

      var city = req.body.city;
      var newTemp = req.body.newTemp;

      var subquery = "SELECT MAX(date) AS max_date FROM weather WHERE location = ?";
      var subvalues = [city];

      con.query(subquery, subvalues, function (err, subresult) {
        if (err) throw err;

        var maxDate = subresult[0].max_date;

        var sql = "UPDATE weather SET temperature = ? WHERE location = ? AND date = ?";
        var values = [newTemp, city, maxDate];

        con.query(sql, values, function (err, result) {
          if (err) throw err;

          console.log("Latest entry updated with new temperature:", newTemp);
          con.end();
          res.render("updateSuccessSQLdb");
        });
      });
    });
  }

  main().catch(console.error);
});

app.post("/deleteByLocationSQLdb", (req, res) => {
  const city = req.body.city;

  async function main() {
    const con = mysql.createConnection({
      host: "127.0.0.1",
      port: "3306",
      user: "root",
      password: "",
      database: "mydb"
    });

    con.connect(function (err) {
      if (err) throw err;
      console.log("Connected!");

      const sql = "DELETE FROM weather WHERE location = ?";
      const values = [city]

      con.query(sql, values, function (err, result) {
        if (err) throw err;
        console.log(`Deleted ${result.affectedRows} row(s)`);
        con.end();
      });
    });
  }

  main().catch(console.error);
  res.render("deleteSuccessSQLdb");
});

app.post("/deleteSQLDatabase", (req, res) => {
  async function main() {
    var con = mysql.createConnection({
      host: "127.0.0.1",
      port: "3306",
      user: "root",
      password: ""
    });

    con.connect(function (err) {
      if (err) throw err;
      console.log("Connected!");

      var sql = "DROP DATABASE IF EXISTS mydb";

      con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Database deleted!");

        con.end();
      });
    });
  }

  main().catch(console.error);

  res.render("deleteSuccessSQLdb");
});

console.log(`Web server started and running at http://localhost:${port}`);
process.stdin.setEncoding("utf-8");
process.stdout.write("Stop to shutdown the server: ");
process.stdin.on("readable", () => {
  let input = process.stdin.read();
  if (input !== null) {
    input = input.trim();
    if (input === "stop") {
      console.log("Shutting down the server!");
      process.exit(0);
    } else {
      console.log(`Invalid command: ${input}`);
    }
    process.stdout.write("Stop to shutdown the server: ");
    process.stdin.resume();
  }
})

app.listen(port);