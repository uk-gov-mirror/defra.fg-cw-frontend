import { create, findAll, update } from "../repositories/user.repository.js";

export const createOrUpdateUser = async (userData) => {
  const [existingUser] = await findAll({
    idpId: userData.idpId,
  });

  return existingUser
    ? await update(existingUser.id, userData)
    : await create(userData);
};
