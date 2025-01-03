import password from "../utils/password.utils.js";

const userAuthenticationCheck = (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  let decodedToken;
  try {
    decodedToken = password.decodeJWT(token);
  } catch (error) {
    //console.log({ error });
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  if (!decodedToken) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  //console.log({ decodedToken });
  req.user = decodedToken;
  next();
};

export default userAuthenticationCheck;