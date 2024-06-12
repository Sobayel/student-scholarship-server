const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const usersCollection = client.db("studentScholarship").collection("users");
    const scholarshipCollection = client.db("studentScholarship").collection("scholarship");
    const reviewCollection = client.db("studentScholarship").collection("review");

    app.post('/jwt', async(req, res) =>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '24d'})
        res.send({token});
    })

      // middlewares
  const verifyToken = (req, res, next) =>{
    
    if(!req.headers.authorization){
      return res.status(401).send({message: 'unauthorized access'});
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
      if(error){
        return res.status(401).send({message: 'unauthorized access'});
      }
      req.decoded= decoded;
      next();
    })
  }

   
  // use verify admin verifyToken
  const verifyAdmin = async (req, res, next) =>{
    const email = req.decoded.email;
    const query = {email : email};
    const user = await usersCollection.findOne(query);
    const isAdmin = user?.role === 'admin';
    if(!isAdmin){
      return res.status(403).send({message: 'forbidden access'})
    }
    next();
  }
    
    // use verify Moderator verifyToken
    const verifyModerator = async (req, res, next) =>{
      const email = req.decoded.email;
      const query = {email : email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'moderator';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }
    
     // create-payment-intent
     app.post('/create-payment-intent',  async (req, res) => {
      const price = req.body.price
      const priceInCent = parseFloat(price) * 100
      if (!price || priceInCent < 1) return
      // generate clientSecret
      const { client_secret } = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: 'usd',
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      })
      // send client secret as response
      res.send({ clientSecret: client_secret })
    })

    // .....................................................................
     // admin
    app.get('/users/admin/:email',verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    // moderator
    app.get('/users/moderator/:email',verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      let moderator = false
      if (user) {
        moderator = user?.role === 'moderator'
      }
      res.send({ moderator })
    })

    // user
   app.get('/users/user/:email', async (req, res) => {
  const email = req.params.email;
  console.log("server", email);
  const query = { email: email };
  const account = await usersCollection.findOne(query);
  console.log('user check user:', account);
  let user = false;
  if (account) {
    user = account?.role === 'user';
  }
  console.log('user is:', user);
  res.send({ user });
});

    // ....................................................................



    app.get('/users', async(req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      })

     
    app.post('/users', async (req, res) => {
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await usersCollection.findOne(query);
        if(existingUser){
          return res.send({message: ' user already exists', insertedId: null})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      })

      // ..................................................

      app.patch('/users/:id',verifyToken, async (req, res) =>{
        const id = req.params.id;
        const role = req.body.role;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            role: role,
          }
        }
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      })
  
      app.delete('/users/:id',verifyToken,verifyAdmin,async (req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      })
      // .........................................................


      app.get('/scholarship', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 0;
            const size = parseInt(req.query.size) || 10;
            const search = req.query.search || '';
            const applicationFees = req.query.applicationFees;
    
            let query = {
                $or: [
                    { universityName: { $regex: search, $options: 'i' } },
                    { subjectName: { $regex: search, $options: 'i' } }
                ]
            };
    
            let sortOptions = {};
            if (applicationFees) {
                sortOptions.applicationFees = applicationFees === 'asc' ? 1 : -1;
            }
    
            const result = await scholarshipCollection.find(query)
                .sort(sortOptions)
                .skip(page * size)
                .limit(size)
                .toArray();
    
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Error fetching scholarships', error });
        }
    });
    
    app.get('/scholarshipCount', async (req, res) => {
        try {
            const search = req.query.search || '';
    
            let query = {
                $or: [
                    { universityName: { $regex: search, $options: 'i' } },
                    { subjectName: { $regex: search, $options: 'i' } }
                ]
            };
    
            const count = await scholarshipCollection.countDocuments(query);
            res.send({ count });
        } catch (error) {
            res.status(500).send({ message: 'Error fetching scholarship count', error });
        }
    });
    

      app.get("/scholarship/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await scholarshipCollection.findOne(query);
        res.send(result);
      });

      app.get('/review', async(req, res) =>{
        const result =await reviewCollection.find().toArray();
        res.send(result);
    })
      app.post('/review', async(req, res) =>{
        const query = req.body;
        const result = await reviewCollection.insertOne(query);
        res.send(result);
    })

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
