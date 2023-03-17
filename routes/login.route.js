var express = require("express");
// import all routers here

const {
  loginForm,
  signUp,
  signIn,
  signOut,
  signInApi,
} = require("../controllers/login.controller");
var router = express.Router();

router.get("/", loginForm);
// router.get("/signup", (req, res) => {
//   res.render("signup");
// });
router.post("/signup", signUp);
router.post("/login", signIn);
router.get("/logout", signOut);
router.post("/api/signin", signInApi);

// dashboard routes
// router.use("/dashboard", dashboardRoute);
// router.use('/users',usersRouter)
module.exports = router;
