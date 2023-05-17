const path = require("path")
const bodyParser = require("body-parser")
const express = require("express")
const app = express()
require("dotenv").config({ path: path.resolve(__dirname, '.env') })
const databaseAndCollection = { db: "FinalProject335", collection: "history" };
const { MongoClient, ServerApiVersion } = require('mongodb');
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const url = `mongodb+srv://${userName}:${password}@cluster0.urwnmp0.mongodb.net/?retryWrites=true&w=majority`;
const apiKey = '714fbbf190ec66c51b46116b4c7d3818';

if (process.argv.length != 3) {
    process.stdout.write("Include port number")
    process.exit(1)
}

const port = process.argv[2]
app.set("views", path.resolve(__dirname, "templates"))
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.render("index")
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
            res.render("printDatabase", { table: table })
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

console.log(`Web server started and running at http://localhost:${port}`)
process.stdin.setEncoding("utf-8")
process.stdout.write("Stop to shutdown the server: ")
process.stdin.on("readable", () => {
    let input = process.stdin.read();
    if (input !== null) {
        input = input.trim();
        if (input === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${input}`);
        }
        process.stdout.write("Stop to shutdown the server: ");
        process.stdin.resume();
    }
})

app.listen(port)