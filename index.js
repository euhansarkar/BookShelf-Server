const express = require(`express`);
const cors = require(`cors`);
const app = express();
var jwt = require("jsonwebtoken");
require("dotenv").config();
const Stripe = require("stripe");
const stripe = Stripe(
  `sk_test_51M7P4lKglMI0jcEshNRoudSA3FQ0Z5WOJAygkvFLYKUL0wRXp1UGgEXKNeigpUvmwefeqFvI2aYcN8knteaaF4Ib00OErFLJOM`
);

const port = process.env.PORT || 5000;
// middle wires
app.use(cors());
app.use(express.json());

// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fczblwv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send(`unauthorized access`);
  }
  // console.log(`jwt admin`,authHeader);
  const token = authHeader.split(` `)[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send(`forbidden access`);
    }
    return (req.decoded = decoded);
    next();
  });
}

async function run() {
  try {
    const productsCollection = client.db(`BookSelf_DB`).collection(`products`);
    const ordersCollection = client.db(`BookSelf_DB`).collection(`orders`);
    const usersCollection = client.db(`BookSelf_DB`).collection(`users`);
    const paymentsCollection = client.db(`BookSelf_DB`).collection(`payments`);
    const wishlistsCollection = client.db(`BookSelf_DB`).collection(`wishlists`);
    const categoriesCollection = client
      .db(`BookSelf_DB`)
      .collection(`categories`);

    // jwt

    app.get(`/jwt`, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      console.log(`this is `, user);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: `7d`,
        });
        return res.send({ accessToken: token });
      }
      return res.status(403).send({ accessToken: `` });
    });

    app.get(`/categories`, async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      return res.send(result);
    });

    app.get(`/category_name`, async (req, res) => {
      const category = {};
      const result = await categoriesCollection
        .find(category)
        .project({ category_id: 1 })
        .toArray();
      return res.send(result);
    });

    app.get(`/products`, async (req, res) => {
      const query = {};
      const result = await productsCollection.find(query).toArray();
      return res.send(result);
    });

    app.get(`/category/:category_name`, async (req, res) => {
      const categoryName = req.params.category_name;
      const query = { category_name: categoryName };
      const result = await productsCollection.find(query).toArray();
      return res.send(result);
    });

    app.post(`/orders`, async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      return res.send(result);
    });

    app.get(`/orders`, async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;
      // if (decodedEmail !== email) {
      //   return res.status(403).send(`forbidden access`);
      // }
      const query = { email: email };
      const userOrders = await ordersCollection.find(query).toArray();
      return res.send(userOrders);
    });

    app.get(`/products/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const singleOrder = await productsCollection.findOne(query);
      return res.send(singleOrder);
    });

    app.post(`/users`, async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      return res.send(result);
    });

    app.get(`/users`, async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      return res.send(result);
    });

    app.put(`/users/admin/:id`, verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== `admin`) {
        return res.status(403).send({ message: `unauthorized access` });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      return res.send(result);
    });

    app.get(`/users/admin/:email`, async (req, res) => {
      const email = req.params.email;
      // console.log(`jwt api`,email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      return res.send({ isAdmin: user?.role === `admin` });
    });

    app.get(`/users/seller/:email`, async (req, res) => {
      const email = req.params.email;
      // console.log(`jwt api`,email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      return res.send({ isSeller: user?.role === `seller` });
    });

    app.get(`/users/buyer/:email`, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      return res.send({ isBuyer: user?.role === `buyer` });
    });

    app.get(`/sellers`, async (req, res) => {
      const query = { role: `seller` };
      const sellers = await usersCollection.find(query).toArray();
      return res.send(sellers);
    });

    app.get(`/buyers`, async (req, res) => {
      const query = { role: `buyer` };
      const buyers = await usersCollection.find(query).toArray();
      return res.send(buyers);
    });

    app.post(`/products`, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      return res.send(result);
    });

    app.get(`/products`, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { seller_email: email };
      const result = await productsCollection.find(query).toArray();
      return res.send(result);
    });

    app.delete(`/products/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.deleteOne(query);
      return res.send(product);
    });

    app.delete(`/orders/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.deleteOne(query);
      return res.send(order);
    });

    app.get(`/payorder/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      // console.log(ordersCollection);
      // console.log(usersCollection);
      const order = await ordersCollection.findOne(query);
      console.log(order);
      return res.send(order);
    });

    app.post(`/create-payment-intent`, async (req, res) => {
      const order = req.body;
      console.log(`inside payment order `, order);
      const price = order.price;
      const amount = price * 100;
      console.log(`amount`, amount);

      if (amount) {
        const paymentIntent = await stripe.paymentIntents.create({
          currency: "usd",
          amount: amount,
          payment_method_types: ["card"],
        });
        return res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });

    app.post(`/payments`, async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.orderId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          isPaid: true,
          transectionId: payment.transectionId,
        },
      };
      const updateResult = await ordersCollection.updateOne(filter, updatedDoc);
      return res.send(result);
    });

    app.post(`/wishlists`, async(req, res) => {
      const product = req.body;
      const result = await wishlistsCollection.insertOne(product);
      return res.send(result);
    })

    app.get(`/wishlists`, async(req, res) => {
      const email = req.query.email;
      const query = {wishLister: email};
      const result = await wishlistsCollection.find(query).toArray();
      return res.send(result);
    })

    app.patch(`/products/:id`, async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const updatedDoc = {
        $set:{
          isReported: true,
        }
      }
      const result = await productsCollection.updateOne(query, updatedDoc);
      return res.send(result);
    })

    app.get(`/reportedproducts`, async(req, res) => {
      const query = {isReported: true};
      const result = await productsCollection.find(query).toArray();
      return res.send(result);
    })

  } finally {
  }
}

run().catch(console.dir);

app.get(`/`, async (req, res) => {
  return res.send(`product server is running`);
});

app.listen(port, async (req, res) => {
  console.log(`product server is running on port ${port}`);
});
