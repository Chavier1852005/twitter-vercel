const { TwitterApi } = require("twitter-api-v2");
const fs = require("fs");

module.exports = async (req, res) => {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
  });

  if (req.method === "GET" && req.query.step === "auth") {
    const { url, oauthToken, oauthTokenSecret } =
      await client.generateAuthLink(process.env.CALLBACK_URL, {
        authAccessType: "write",
      });

    return res.status(200).json({
      url,
      oauthToken,
      oauthTokenSecret,
    });
  }

  if (req.method === "POST" && req.body.step === "callback") {
    const { oauthToken, oauthVerifier, oauthTokenSecret } = req.body;

    const loginClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });

    const { client: userClient } = await loginClient.login(oauthVerifier);

    await userClient.v1.updateAccountProfile({
      name: "New Display Name",
      description: "New bio here.",
      url: "https://ko-fi.com/darkmea",
    });

    const profilePicData = fs.readFileSync(
      "./media/profile.jpg",
      { encoding: "base64" }
    );
    const bannerData = fs.readFileSync(
      "./media/banner.jpg",
      { encoding: "base64" }
    );

    await userClient.v1.updateAccountProfileImage(profilePicData);
    await userClient.v1.updateAccountProfileBanner(bannerData);

    return res.status(200).send("Your X profile has been updated.");
  }

  return res.status(400).send("Invalid request");
};