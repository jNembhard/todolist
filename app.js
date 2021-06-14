//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const wakeDyno = require("woke-dyno");
const mongoose = require("mongoose");
const _ = require("lodash");
const PORT = process.env.PORT || 3000;

const app = express();

const username = process.env.USER_KEY;
const apiKey = process.env.API_KEY;

// const url = "mongodb://localhost:27017/todolistDB";
const uri = `mongodb+srv://${username}:${apiKey}@cluster0.qr7fx.mongodb.net/ToDoList?retryWrites=true&w=majority`;

const connectionParams = {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true};

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect(uri, connectionParams)
.then(() => {
  console.log("MongoDB Connected")
})
.catch(err => console.log(err))

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to the todolist!"
});

const item2 = new Item({
  name: "Click the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const routeSchema = {
  name: String,
  items: [itemsSchema]
}

const Route = mongoose.model("Route", routeSchema)

const day = date.getDate();

app.get("/", function(req, res) {
  Item.find({}, function(err, foundItems) {

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("successfully saved all the items to the DB");
        }
      });
      res.redirect("/");

    } else {
      res.render("list", {listTitle: day, newListItems: foundItems});
    }
  });
});

app.post("/", function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === day) {
    item.save();
    res.redirect("/");
  } else {
    Route.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === day) {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (!err) {
        console.log("successfully deleted item from the DB.");
        res.redirect("/");
      }
    });
  } else {

    const filter = {name: listName};
    const update = {$pull: {items: {_id: checkedItemId}}};

    Route.findOneAndUpdate(filter, update, function(err, foundItem) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }

});

app.get("/:routeListName", function(req, res) {
  let routeListName = _.capitalize(req.params.routeListName);

  Route.findOne({
    name: routeListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        // Create new list for routes
        const route = new Route({
          name: routeListName,
          items: defaultItems
        });

        route.save();
        res.redirect("/" + routeListName);

      } else {
        // Show an existing route
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});

app.get("/about", function(req, res) {
  res.render("about");
});

app.listen(PORT, function() {
  wakeDyno(uri).start(); // prevents app from falling asleep
  console.log("Server is running on port " + PORT);
});
