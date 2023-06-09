module.exports = {
    authenticateUser: async (req, res, next) => {
        try {
            if (!req.session.user) {
                // res.json({
                //     message:{info:'Looks like your session just ended..login to proceed',type:'error'}
                // })
                // res.render('signin',{
                //     message:{info:'Looks like your session just ended..login to proceed',type:'error'}
                // })
                res.redirect('/?error=no_session')
            }
            next();
        } catch (error) {
            res.json({error:error})
        }

    }
}