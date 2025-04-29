import prisma from "../exportPrisma.js";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import sizeOf from "image-size";

const serverError = (res, err) => {
  res.status(500).end("Server error");
  console.log(err);
};

const validate = (token) => {
  token = token.split(" ")[1];
  const decodedToken = jwt.verify(token, process.env.key);
  return decodedToken;
};

const processImage = (req, photo) => {
  let dimensions = sizeOf(photo.path);
  return {
    url: `${req.protocol}://${req.get("host")}/images/${photo.filename}`,
    height: dimensions.height,
    width: dimensions.width,
    filename: photo.filename,
  };
};

const getPageOffset = (query) => {
  if (!query) return 0;
  if (isNaN(parseInt(query))) return 0;
  const page = parseInt(query);
  if (page < 0) return 0;
  return page * 20;
};

export const searchStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        name: {
          contains: req.body.name,
        },
      },
      include: {
        owner: true,
        pictures: true,
      },
      skip: getPageOffset(req.query.page),
      take: 20,
    });

    res.status(200).json(stores);
  } catch (err) {
    return serverError(res, err);
  }
};

export const searchProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: req.body.name,
        },
      },
      skip: getPageOffset(req.query.page),
      take: 20,
      include: {
        pictures: true,
        store: true,
      },
    });

    res.status(200).json(products);
  } catch (err) {
    return serverError(res, err);
  }
};

export const getAllStoresForUser = async (req, res) => {
  try {
    if (!req.params.page) return res.status(400).end("Bad req");

    if (!req.headers.token) return res.status(403).end("Access denied");

    const decodedToken = validate(req.headers.token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
    });

    if (!user) return res.status(404).json("User doesnt exist");

    const stores = await prisma.store.findMany({
      where: {
        ownerId: decodedToken.userId,
      },
      orderBy: {
        name: "asc",
      },
      skip: getPageOffset(req.query.page),
      take: 20,
    });

    if (!stores.length)
      return res.status(404).end("stores not found for this user");

    res.status(200).json(stores);
  } catch (err) {
    return serverError(res, err);
  }
};

export const getProductsForStore = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        products: true,
      },
    });
    if (!store) return res.status(404).end("Store not found");

    res.status(200).json(store);
  } catch (err) {
    serverError(res, err);
  }
};

export const createStoresForUser = async (req, res) => {
  try {
    const { storeData } = req.body;
    if (!(storeData?.name || storeData?.address))
      return res.status(400).end("Bad req");

    const { token } = req.headers;
    if (!token) return res.status(403).end("Access Denied.");
    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
    });
    if (!user) return res.status(404).end("User not found");

    await prisma.user.update({
      where: {
        id: decodedToken.userId,
      },
      data: {
        stores: {
          create: {
            ...req.body.storeData,
          },
        },
      },
    });

    if (req.files && req.files.length !== 0) {
      await prisma.store.update({
        where: { name: req.body.storeData.name },
        data: {
          pictures: {
            createMany: req.files.map((file) => processImage(req, file)),
          },
        },
      });
    }

    const newUser = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      include: {
        stores: true,
      },
    });

    res.status(201).json(newUser);
  } catch (err) {
    serverError(res, err);
  }
};

export const createProductsForStore = async (req, res) => {
  try {
    const { productData, storeId } = req.body;
    if (!productData || !storeId) return res.status(400).end("Bad req");

    const token = req.headers.token;

    if (!token) return res.status(403).end("Access Denied");

    const decodedToken = validate(token);

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      select: {
        ownerId: true,
      },
    });
    if (!store) return res.status(404).end("Store not found");

    if (store.ownerId != decodedToken.userId)
      return res.status(403).end("Access Denied");

    await prisma.store.update({
      where: {
        id: storeId,
      },
      data: {
        products: {
          create: productData,
        },
      },
    });

    if (req.files && req.files.length !== 0) {
      await prisma.product.update({
        where: {
          name: productData.name,
        },
        data: {
          pictures: {
            createMany: req.files.map((file) => processImage(req, file)),
          },
        },
      });
    }

    const updatedStore = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      include: {
        products: true,
      },
    });
    res.status(201).json(updatedStore);
  } catch (err) {
    serverError(res, err);
  }
};

export const updateUser = async (req, res) => {
  try {
    const { token } = req.headers;
    const { newData } = req.body;

    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) return res.status(404).end("Access Denied.");

    if (newData?.password)
      return res.status(403).end("Cannot change password on this route.");

    const updatedUser = await prisma.user.update({
      where: {
        id: decodedToken.userId,
      },
      data: {
        ...newData,
      },
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    return serverError(res, err);
  }
};

export const updateStore = async (req, res) => {
  try {
    const { token } = req.headers;
    const { newData } = req.body;

    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) return res.status(404).end("User does not exist");

    const store = await prisma.store.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        ownerId: true,
        id: true,
      },
    });

    if (store.ownerId !== user.id) return res.status(403).end("Access Denied.");

    const newPics = req?.files && req.files.length;

    if (newPics) {
      const oldPics = await prisma.photo.findMany({
        where: {
          storeId: store.id,
        },
        select: {
          filename: true,
        },
      });

      for (const photo of oldPics) {
        await fs.promises.unlink(
          path.join(__dirname, "..", "images", photo.filename)
        );
      }

      await prisma.photo.deleteMany({
        where: {
          storeId: store.id,
        },
      });
    }

    const updatedStore = await prisma.store.update({
      where: {
        id: store.id,
      },
      data: {
        ...newData,
        pictures: {
          createMany: newPics
            ? req.files.map((file) => processImage(req, file))
            : null,
        },
      },
    });

    res.status(200).json(updatedStore);
  } catch (err) {
    return serverError(res, err);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { token } = req.headers;
    const { newData, storeId } = req.body;

    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) return res.status(404).end("User does not exist");

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      select: {
        ownerId: true,
        id: true,
      },
    });

    if (store.ownerId !== user.id) return res.status(403).end("Access Denied.");

    const product = await prisma.product.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        id: true,
        storeId: true,
      },
    });

    if (product.storeId !== store.id)
      return res.status(403).end("Access Denied.");

    const newPics = req?.files && req.files.length;

    if (newPics) {
      const oldPics = await prisma.photo.findMany({
        where: {
          productId: product.id,
        },
        select: {
          filename: true,
        },
      });

      for (const photo of oldPics) {
        await fs.promises.unlink(
          path.join(__dirname, "..", "images", photo.filename)
        );
      }

      await prisma.photo.deleteMany({
        where: {
          productId: product.id,
        },
      });
    }

    const upDatedProduct = await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        ...newData,
        pictures: {
          createMany: newPics
            ? req.files.map((file) => processImage(req, file))
            : null,
        },
      },
    });

    res.status(200).json(upDatedProduct);
  } catch (err) {
    return serverError(res, err);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { token } = req.headers;

    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
    });

    if (!user) return res.status(400).end("User does not exist. Cannot delete");

    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    res.status(204).json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
};

export const deleteStore = async (req, res) => {
  try {
    const { token } = req.headers;
    const { id } = req.params;

    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) return res.status(403).end("Access Denied");

    const store = await prisma.store.findUnique({
      where: {
        id,
      },
      include: {
        pictures: true,
      },
    });

    if (!store) return res.status(404).end("Store does not exist");

    if (store.ownerId !== user.id) return res.status(403).end("ACcess denied");

    await prisma.store.delete({
      where: {
        id,
      },
    });

    return res.status(204).json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { token } = req.headers;
    const { id } = req.params;

    const decodedToken = validate(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) return res.status(403).end("Access Denied");

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        pictures: true,
      },
    });

    if (!product) return res.status(404).end("Product does not exist");

    const store = await prisma.store.findUnique({
      where: {
        id: product.storeId,
      },
      select: {
        ownerId: true,
      },
    });

    if (!store) return res.status(404).end("Store does not exist");

    if (store.ownerId !== user.id) return res.status(403).end("ACcess denied");

    await prisma.product.delete({
      where: {
        id,
      },
    });

    return res.status(204).json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
};
