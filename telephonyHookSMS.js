
exports.handler = async function(context, event, callback) {

  const client = context.getTwilioClient();

  // Prints to console log the name of the user signing in and requesting OTP
  console.log(" ");
  console.log(event)
  console.log(
    "Processing OTP delivery for " +
      event.data.userProfile["firstName"] +
      " " +
      event.data.userProfile["lastName"] +
      " " +
      event.data.userProfile["login"]
  );

  // Saves phone number for the user requesting OTP in the variable userPhoneNumber and prints it to the console log
  var userPhoneNumber = event.data.messageProfile["phoneNumber"];

  // Saves OTP code from Okta to send to user via SMS provider
  var userOtpCode = event.data.messageProfile["otpCode"];

  // Retrieves the sender/from phone number
  var from = process.env.FROM_PHONE_NUMBER;
  const actionKey = "com.okta.telephony.action";
  const actionVal = "PENDING";
  const providerName = "TWILIO_HOOK";

  console.log(`To:${userPhoneNumber}. From:${from}. OTP:${userOtpCode}`)

  // Uses userPhoneNumber and userOTP variables to send to third-party telephony provider
  if (
    event.data.messageProfile["deliveryChannel"].toLowerCase() === "sms"
  ) {
    console.log("Sending SMS ...");
    client.messages
        .create({
          body: `Your IAMSE code is ${userOtpCode}`,
          to: userPhoneNumber,
          from: from,
        })
        .then((message) => {
          console.log("Successfully sent sms: " + message.sid);

          const resp = {
            commands: [
              {
                type: actionKey,
                value: [
                  {
                    status: actionVal,
                    provider: providerName,
                    transactionId: message.sid,
                  },
                ],
              },
            ],
          }
          return callback(null, resp);
        })
        .catch((error) => {
          console.log("Error sending message: " + error);
          const errorResp = {
            error: {
              errorSummary: error.message,
              errorCauses: [
                {
                  errorSummary: error.status,
                  reason: error.moreInfo,
                  location: error.detail,
                },
              ],
            },
          };
          callback(errorResp);
        });
  } else {
    console.log("Making CALL ...");
    // Add space to OTP digits for correct pronunciation
    userOtpCode = userOtpCode.replace(/\B(?=(\d{1})+(?!\d))/g, " ");

    client.calls
      .create({ 
        to: userPhoneNumber,
        from: from, 
        twiml: `<Response><Say>Your IAMSE code is ${userOtpCode}</Say></Response>`
      })
      .then((call) => {
          console.log("Successfully started call: " + call.sid);
          const resp = {
            commands: [
              {
                type: actionKey,
                value: [
                  {
                    status: "SUCCESSFUL",
                    provider: providerName,
                    transactionId: call.sid,
                  },
                ],
              },
            ],
          };
          return callback(null, resp);
      })
      .catch((error) => {
          console.log("Error making call: " + error);
          const errorResp = {
            error: {
              errorSummary: error.message,
              errorCauses: [
                {
                  errorSummary: error.status,
                  reason: error.moreInfo,
                  location: error.detail,
                },
              ],
            },
          };
          callback(errorResp);
      });
  }
};
