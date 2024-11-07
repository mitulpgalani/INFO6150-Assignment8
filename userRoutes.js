const express = require('express');
const multer = require('multer');
const User = require('./models/user');
const router = express.Router();


const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const { email } = req.body;
    console.log(email);
    cb(null, './images');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } 
});


const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/; 
const fullNameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;


function validateInput(email, fullName, password) {
  const validationErrors = {};
  if (!emailRegex.test(email)) {
    validationErrors.email = 'Invalid email format';
  }
  if (!fullNameRegex.test(fullName)) {
    validationErrors.fullName = 'Full name can only contain letters, spaces, apostrophes, hyphens, and periods';
  }
  if (!passwordRegex.test(password)) {
    validationErrors.password = 'Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, and one number';
  }
  return validationErrors;
}


router.post('/create', async (req, res) => {
  console.log(req.body);
  const { fullName, email, password } = req.body;
  const validationErrors = validateInput(email, fullName, password);
  if (Object.keys(validationErrors).length) {
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }
    const user = new User({
      fullName,
      email,
      password, 
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully', user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});


router.put('/edit', async (req, res) => {
  const { email, fullName, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.fullName = fullName || user.fullName;
    if (password) user.password = password; 
    await user.save();
    res.status(200).json({ message: 'User updated successfully', user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});


router.delete('/delete', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOneAndDelete({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});


router.get('/getAll', async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users', error: error.message });
  }
});


router.post('/uploadImage', upload.single('image'), async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    } else if (user.imagePath) {
      return res.status(409).json({ message: 'Image already uploaded' });
    }
    user.imagePath = req.file.path;
    await user.save();
    res.status(200).json({ message: 'Image uploaded successfully', filePath: req.file.path });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

module.exports = router;
