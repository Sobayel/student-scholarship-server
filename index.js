const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const app = express();
const port = process.env.PORT || 9000;

const corsData ={
  origin: [
    'http://localhost:5173',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsData));
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xfjzvlh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("studentScholarship").collection("users");
    const scholarshipCollection = client.db("studentScholarship").collection("scholarship");

    app.post('/jwt', async(req, res) =>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '24d'})
        res.send({token});
    })


    app.get('/users', async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      })

    app.post('/users', async (req, res) => {
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
          return res.send({message: ' user already exists', insertedId: null})
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      })

      app.get('/scholarship', async(req, res) => {
        const result = await scholarshipCollection.find().toArray();
        res.send(result);
      })

      app.get("/scholarship/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await scholarshipCollection.findOne(query);
        res.send(result);
      });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('boss is sitting')
  })
  
  app.listen(port, () => {
    console.log(`Student Scholarship is sitting on port ${port}`);
  })
