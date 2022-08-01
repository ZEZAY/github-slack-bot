import express from "express"

export const app = express();

app.use(express.json())

app.get("/", (req, res) => {
    return res.send("hello world");
});

app.post("api/data", (req, res) => {
    console.log(req.body);
    return res.sendStatus(200)
});