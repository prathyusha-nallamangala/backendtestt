const openid = require('openid');
const User = require('../models/User');

const relyingParty = new openid.RelyingParty(
  process.env.OPENID_RETURN_URL, // Callback URL
  process.env.OPENID_REALM,      // Realm (your app's URL)
  true,                         // Stateless
  false,                        // Strict mode
  []                            // Extensions to request
);

exports.initiateOpenIDLogin = (req, res) => {
  const identifier = req.query.openid_identifier; // User can provide an OpenID identifier

  if (!identifier) {
    // If no identifier is provided, you might redirect to a page where user can input it
    // For now, let's assume a default provider or prompt for one.
    // In a real app, you'd have a UI for this or use a known provider URL.
    return res.status(400).json({ message: 'OpenID identifier is required.' });
  }

  relyingParty.authenticate(identifier, false, (err, authUrl) => {
    if (err) {
      console.error('OpenID authentication error:', err);
      return res.status(500).json({ message: 'Error initiating OpenID authentication.', error: err.message });
    }
    if (!authUrl) {
      return res.status(500).json({ message: 'Authentication URL not generated.' });
    }
    res.redirect(authUrl);
  });
};

// @desc    OpenID 2.0 callback endpoint (Assertion Consumer Service)
// @route   GET /api/auth/openid/callback
// @access  Public
exports.openIDCallback = (req, res) => {
  relyingParty.verifyAssertion(req, (err, result) => {
    if (err) {
      console.error('OpenID verification error:', err);
      // Handle error cases like invalid credentials, provider unavailability, user cancellation
      let errorMessage = 'OpenID authentication failed.';
      if (err.message.includes('Cancelled')) {
        errorMessage = 'OpenID login was cancelled by the user.';
      } else if (err.message.includes('Invalid assertion')) {
        errorMessage = 'Invalid credentials or malformed response.';
      }
      // Redirect to login page with error or display error message
      return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
    }
    if (!result.authenticated) {
      // This might happen if result.authenticated is false but no explicit error
      return res.redirect('/login?error=Authentication failed or could not be verified.');
    }

    // Successfully authenticated
    const openidIdentifier = result.claimedIdentifier;
    const email = result.email; // OpenID 2.0 typically doesn't directly provide email unless extensions are used
                                // For simplicity, we'll assume it might be present or fetched later.

    User.findOne({ openid_identifier: openidIdentifier })
      .then(user => {
        if (!user) {
          // User does not exist, create a new one
          const newUser = new User({ openid_identifier: openidIdentifier, email: email });
          return newUser.save();
        }
        return user;
      })
      .then(user => {
        // Create and manage user session
        req.session.userId = user._id;
        req.session.openidIdentifier = user.openid_identifier;
        console.log(`User ${user.openid_identifier} logged in. Session ID: ${req.session.id}`);

        // Redirect to a protected dashboard or home page
        res.redirect('/dashboard'); // Or send a success message/token for API clients
      })
      .catch(dbErr => {
        console.error('Database error during user lookup/creation:', dbErr);
        res.redirect(`/login?error=${encodeURIComponent('Internal server error during user processing.')}`);
      });
  });
};

// @desc    Logout user and destroy session
// @route   POST /api/auth/logout
// @access  Private (requires active session)
exports.logout = (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Could not log out, please try again.' });
      }
      res.status(200).json({ message: 'Logged out successfully.' });
    });
  } else {
    res.status(200).json({ message: 'No active session to log out from.' });
  }
};

// @desc    Check if a session is active
// @route   GET /api/auth/session
// @access  Public
exports.checkSession = (req, res) => {
  if (req.session && req.session.userId) {
    res.status(200).json({ authenticated: true, userId: req.session.userId });
  } else {
    res.status(200).json({ authenticated: false });
  }
};
