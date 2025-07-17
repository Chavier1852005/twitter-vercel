const { TwitterApi } = require("twitter-api-v2");
const axios = require("axios");

module.exports = async (req, res) => {
  try {
    console.log("TWITTER_API_KEY:", process.env.TWITTER_API_KEY);
    console.log("TWITTER_API_SECRET:", process.env.TWITTER_API_SECRET);
    console.log("CALLBACK_URL:", process.env.CALLBACK_URL);
    console.log("Request method:", req.method);
    console.log("Request query:", req.query);

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    // 🔐 Step 1: Generate Auth Link
    if (req.method === "GET" && req.query.step === "auth") {
      try {
        const authResponse = await client.generateAuthLink(process.env.CALLBACK_URL, {
          authAccessType: "write",
        });

        console.log("Full auth response:", authResponse);
        return res.status(200).json(authResponse);
      } catch (err) {
        console.error("Auth step failed:", err);
        return res.status(500).json({
          error: "Auth step failed",
          message: err.message,
          stack: err.stack,
        });
      }
    }

    // 🔁 Step 2: Handle Callback
    if (req.method === "POST" && req.body.step === "callback") {
      try {
        const { oauthToken, oauthVerifier, oauthTokenSecret } = req.body;
        console.log("Received callback payload:", { oauthToken, oauthVerifier, oauthTokenSecret });

        const loginClient = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY,
          appSecret: process.env.TWITTER_API_SECRET,
          accessToken: oauthToken,
          accessSecret: oauthTokenSecret,
        });

        const { client: userClient } = await loginClient.login(oauthVerifier);
        console.log("Logged in to Twitter API");

        await userClient.v1.updateAccountProfile({
          name: "New Display Name",
          description: "New bio here.",
          url: "https://ko-fi.com/darkmea",
        });
        console.log("Profile text updated");

        const profilePicUrl = "https://twitter-vercel-plum.vercel.app/profile.jpg";
        const bannerUrl = "https://twitter-vercel-plum.vercel.app/banner.jpg";

        const profilePicRes = await axios.get(profilePicUrl, { responseType: "arraybuffer" });
        const bannerRes = await axios.get(bannerUrl, { responseType: "arraybuffer" });

        const profilePicData = Buffer.from(profilePicRes.data).toString("base64");
        const bannerData = Buffer.from(bannerRes.data).toString("base64");

        console.log("Fetched image sizes:", {
          profilePicSize: profilePicData.length,
          bannerSize: bannerData.length,
        });

        await userClient.v1.updateAccountProfileImage(profilePicData);
        await userClient.v1.updateAccountProfileBanner(bannerData);
        console.log("Images uploaded");

        return res.status(200).send("Your X profile has been updated.");
      } catch (err) {
        console.error("Callback step failed:", err);
        return res.status(500).json({
          error: "Callback step failed",
          message: err.message,
          stack: err.stack,
        });
      }
    }

    // ❌ Invalid Request
    return res.status(400).send("Invalid request");
  } catch (error) {
    console.error("Function error:", error);
    return res.status(500).json({
      error: "Function crashed",
      message: error.message,
      stack: error.stack,
    });
  }
};