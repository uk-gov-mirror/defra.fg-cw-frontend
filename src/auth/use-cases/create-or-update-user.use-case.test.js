import { describe, expect, it, vi } from "vitest";
import { create, findAll, update } from "../repositories/user.repository.js";
import { createOrUpdateUser } from "./create-or-update-user.use-case.js";

vi.mock("../repositories/user.repository.js");

describe("createOrUpdateUserUseCase", () => {
  it("creates a user when one does not exist", async () => {
    const userData = {
      idpId: "testIdpId",
      firstName: "John",
    };

    await createOrUpdateUser(userData);

    expect(findAll).toHaveBeenCalledWith({
      idpId: "testIdpId",
    });

    expect(create).toHaveBeenCalledWith(userData);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates a user when one exists", async () => {
    const existingUser = {
      id: "123",
      idpId: "testIdpId",
      firstName: "John",
    };

    findAll.mockResolvedValue(existingUser);

    const userData = {
      idpId: "testIdpId",
      firstName: "Jane",
    };

    await createOrUpdateUser(userData);

    expect(findAll).toHaveBeenCalledWith({
      idpId: "testIdpId",
    });

    expect(update).toHaveBeenCalledWith(existingUser.id, userData);
    expect(create).not.toHaveBeenCalled();
  });
});
