var express = require("express");
// import all routers here

const {
  loginForm,
  signUp,
  signIn,
  signOut,
  signInApi,
  signUpApi
} = require("../controllers/login.controller");
var router = express.Router();

// const {authenticateUser} = require('./middlewares/authenticate');
// router.use(authenticateUser);

router.get("/", loginForm);
// router.get("/signup", (req, res) => {
//   res.render("signup");
// });
router.post("/signup", signUp);
router.post("/login", signIn);
router.get("/logout", signOut);
router.post("/api/signin", signInApi);
router.post("/api/signup", signUpApi);

// dashboard routes
// router.use("/dashboard", dashboardRoute);
// router.use('/users',usersRouter)
module.exports = router;
