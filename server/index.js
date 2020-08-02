const express = require("express");
const app = express();
const port = 5000

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const config = require("./config/key");

const { User } = require("./models/User");
const { auth } = require("./middleware/auth");

//application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

//application/json
app.use(bodyParser.json());
app.use(cookieParser());

const mongoose = require('mongoose');
mongoose.connect(config.mongoURI, 
    {
    useNewUrlParser: true, useUnifiedTopology: true, 
    useCreateIndex: true, useFindAndModify: false
})
.then(() => console.log('MongoDB Connected...'))
. catch(err => console.log(err))



app.post('/api/users/register', (req, res) => {

    //회원 가입 할때 필요한 정보들을 client에서 가져오면
    // 그것들을 데이타 베이스에 넣어준다

    

        const user = new User(req.body)

        user.save((err, userInfo) => {
            if(err) return res.json({ success: false, err })
            return res.status(200).json({
                success: true
            })
        })

    })

app.post('/api/users/login', (req, res) => {

    //요청된 이메일을 DB에 있는지 찾는다.
    User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) 
            return res.json({
                loginSuccess: false, 
                message: "제공된 이메일에 해당하는 유저가 없습니다"
            })
        

        //요청된 이메일이 데이터 베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인한다.
        user.comparePassword(req.body.password , (err, isMatch ) => {
            if (!isMatch)
             return res.json({ loginSuccess: false, message: "비번이 틀렸습니다"})


            //비번까지 맞다면 토큰을 생성한다. 
            user.generateToken((err, user) => { 
                if (err) return res.status(400).send(err);

                // 토큰을 저장한다. 쿠키에 저장한다.
                 res.cookie("x_auth", user.token)
                .status(200)
                .json({ loginSuccess: true, userId: user._id })
            })
        })
    })
})

// role 1 = admin, role 0 = 일반유저. 
app.get('/api/users/auth', auth , (req, res) => {

    // 여기까지 미들웨어(가운데 auth)를 통과해 왔다는 얘기는 Authenticatoin 이 True라는 말. 

    res.status(200).json({

        //여기 있는것들은 authentication 통과후 유저한테서 받아오는 정보들.
        //이제 여기있는 정보를 가지고 다른 페이지를 가거나 할수있음 (로그인후 보이는 화면들에서 무엇인가 할때 필요한것들.. 
        // 다시 안가져와도 됨 여기에 저장됨)
        _id: req.user._id,
        isAdmin: req.user.role=== 0? false : true,
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.role,
        image: req.user.image
    })
})

//로그아웃 route를 만들어주는 코드
//(res,req) 콜백 fucntion.
app.get('/api/users/logout', auth, (req,res) => {
    
    //findOneandUpdate == 유저를 찾아서 업데이트 해라(상태 등).
    User.findOneAndUpdate({_id: req.user._id}, //유저아이디 가저오기 auth.js에서 함
        { token: ""} //이코드는 토큰을 지워주는 코드
        , (err, user) => { //콜백함수
            if(err) return res.json({ success: false, err });
            return res.status(200).send({
                success: true
            })
        })
})





app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))