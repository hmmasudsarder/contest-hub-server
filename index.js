require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.suyjuyq.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const AllCollection = client.db('contest').collection('course');
    const courseCollection = client.db('contest').collection('perces');
    const userCollection = client.db('contest').collection('user');


    // JWT related api 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({
        token
      });
    })
    const verifyToken = (req, res, next) => {
      console.log('in', req.headers.authorization);
      if(!req.headers.authorization) {
        return res.send(401).send({ message: 'forbidden unauthorization'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=> {
        if(err){
          return res.send(401).send({ message: 'forbidden unauthorization'})
        }
        req.decoded = decoded;
        next();
      })
    };
      // use verify admin after verifyToken
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded?.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }

    app.get('/users/admin/:email', verifyToken, async(req, res) => {
      const email = req.params.email;
      if(email !== req.decoded?.email){
        return res.status(403).send({message: 'unauthorization'})
      }
      const query = {email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({admin})
    });


    app.get('/allContest', async (req, res) => {
      const result = await AllCollection.find().toArray();
      res.send(result);
    })

    app.get('/contest', async (req, res) => {
      const cursor = AllCollection.find().sort({
        orders: "desc"
      }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/contest/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };
      const result = await AllCollection.findOne(query);
      res.send(result)
    });

    app.post('/contest', verifyToken, async(req, res) => {
      const contestItem = req.body;
      const result = await AllCollection.insertOne(contestItem);
      res.send(result);
    });

    app.get('/contest/:email', async(req, res) => {
      const email = req.params.email;
      const result = await AllCollection.find({'moderator.email': email}).toArray()
    })

    app.get('/parces', async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email
      }
      const result = await courseCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = {
        email: user.email
      }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: 'user already exits',
          insertedId: null
        })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result)
    })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })
    app.post('/parces', async (req, res) => {
      const item = req.body;
      const result = await courseCollection.insertOne(item);
      res.send(result)
    });

    app.delete("/parces/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    })

    await client.db("admin").command({
      ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Your Contest Hub Server is running')
});

app.listen(port, () => {
  console.log(`Contest Hub is running ${port}`)
})