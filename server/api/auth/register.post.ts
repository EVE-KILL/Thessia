import { Users } from "../../models/Users";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const accessToken = body.accessToken as string;
  const expiresIn = body.expiresIn as number;
  const refreshToken = body.refreshToken as string;
  const characterId = body.characterId as number;
  const characterName = body.characterName as string;
  const scopes = (body.scopes as string).split(" ");
  const tokenType = body.tokenType as string;
  const characterOwnerHash = body.characterOwnerHash as string;
  const uniqueIdentifier = body.uniqueIdentifier as string;
  // Convert expiresIn which is a number to a date, by taking current date and adding the seconds to it
  const dateExpiration = new Date(Date.now() + expiresIn * 1000);

  const user = new Users({
    accessToken,
    dateExpiration,
    refreshToken,
    characterId,
    characterName,
    scopes,
    tokenType,
    characterOwnerHash,
    uniqueIdentifier,
  });

  try {
    await user.save();
  } catch (error) {
    await Users.updateOne(
      { characterId: characterId },
      {
        accessToken,
        dateExpiration,
        refreshToken,
        characterId,
        characterName,
        scopes,
        tokenType,
        characterOwnerHash,
        uniqueIdentifier,
      },
    );
  }

  return {
    status: 200,
    body: {
      message: "User created",
    },
  };
});
