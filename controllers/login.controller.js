const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
module.exports = {
  loginForm: (req, res) => {
    console.log('New visitor');
    res.render("signin", { title: 'Sign in to Lipa' });
  },
  signUp: async (req, res) => {
    try {
      const { first_name, last_name, email } = req.body;
      const phone = parseInt(req.body.phone);
      var pass = req.body.password;

      let userExists = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      console.log(userExists);
      if (userExists) {
        res.status(401).render("signup", {
          message: {
            info: "username taken try another note you can add numbers",
            type: "warning",
          },
        });
        return;
      }

      pass = bcrypt.hashSync(pass, 10);

      let user = await prisma.user.create({
        data: {
          first_name: first_name,
          last_name: last_name,
          email: email,
          password: pass,
          phone: phone
        },
      });
      console.log(user.password);

      // res.render("signin", {
      //   message: {
      //     info: `User ${user.first_name} created successfully`,
      //     type: "success",
      //   },
      //   fire: "fire",
      // });
      res.redirect('/');
    } catch (err) {
      return res.status(401).render("signup", {
        message: { info: "Oops!! sorry cant reach database", type: "error" },
        fire: "fire",
        Swal: require("sweetalert2"),
      });
    }
  },
  signIn: async (req, res) => {
    try {
      const { username, password } = req.body;
      // check if user exists
      let user = await prisma.user.findUnique({
        include: { role: true, designation: true },
        where: {
          username: username,
        },
      });

      if (!user) {
        return res.render("signin", {
          // return res.json( {
          Swal: require("sweetalert2"),
          message: {
            info: "No user with the supplied username",
            type: "error",
          },
          fire: "fire",
        });
      }

      //   compare passswords
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) throw err;

        if (result) {
          // setting the user session
          req.session.user = user;
          console.log(req.session.user);
          return res.status(200).redirect("/dashboard");
        } else {
          return res.render("signin", {
            Swal: require("sweetalert2"),
            message: { info: "Invalid Credentials", type: "alert-danger" },
            fire: "fire",
          });
        }
      });
    } catch (error) {
      res.status(401).render("signin", {
        message: { info: "Oops! server unavailable, try again", type: "error" },
        Swal: require("sweetalert2"),
        fire: "fire",
      });
    }
  },
  signOut: async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return console.log(err);
      }
      console.log(req.session);
      res.redirect("/");
    });
  },
  signInApi: async (req, res) => {
    try {
      console.log('Visitor trying to sign in...')
      const { email, password } = req.body;
      // check if user exists
      let user = await prisma.user.findUnique({
        // include: { role: true, designation: true },
        where: {
          email: email,
        },
      });

      if (!user) {
        // return res.render("signin", {
        return res.json({
          Swal: require("sweetalert2"),
          message: {
            info: "No user with the supplied email",
            type: "warning",
          },
          fire: "fire",
        });
      }

      //   validate passswords this function returns true or false as the result when the passwords match
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) throw err;
        console.log(result)
        console.log(user)
        if (result) {
          // setting the user session
          req.session.user = user;
          console.log(req.session.user);
          return res.status(200).json({
            message: { info: "Login successfull redirecting...", type: "success" },
          });
        } else {
          return res.status(200).json({
            message: { info: "Invalid Credentials", type: "error" },
          });
        }
      });
    } catch (error) {
      res.status(401).render("signin", {
        message: { info: "Oops! server unavailable, try again", type: "error" },
        Swal: require("sweetalert2"),
        fire: "fire",
      });
    }
  },

  signUpApi: async (req, res) => {
    try {
      const { first_name, last_name, email } = req.body;
      const phone = req.body.phone;
      var pass = req.body.password;

      let userExists = await prisma.user.findUnique({
        where: {
          email: email,
        },
      })

      console.log(userExists);

      if (userExists) {
        res.json({
          message: {
            info: "email already in use, log in to your account",
            type: "warning",
          },
        });
        return;
      } else {
        pass = bcrypt.hashSync(pass, 10);

        let user = await prisma.user.create({
          data: {
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: pass,
            phone: phone
          },
        });

        res.json({
          message: {
            info: `User ${user.first_name} created successfully! redirecting to login...`,
            type: "success",
          },
        });
      }
    } catch (err) {
      return res.json({
        message: { info: "Oops!! sorry cant reach database", type: "error" },
        fire: "fire",
      });
    }
  }
};
