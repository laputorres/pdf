import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-04";
import express from "express";
import multer from "multer";
import axios from "axios";
import prisma from "./db.server";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

// Agregar middleware para parsear JSON y manejar archivos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint para subir el PDF
app.post("/upload-pdf", upload.single('pedido'), async (req, res) => {
  try {
    const file = req.file;
    const fileBuffer = file.buffer.toString('base64');
    const session = await shopify.sessionStorage.loadSession(req.headers['x-shopify-shop-domain']);

    const shopifyFile = {
      input: {
        file: fileBuffer,
        mediaContentType: "APPLICATION_PDF",
        description: "Pedido PDF generado desde la aplicación",
        filename: "pedido.pdf",
      },
    };

    const response = await axios.post(
      `https://${session.shop}/admin/api/2024-04/graphql.json`,
      {
        query: `
          mutation fileCreate($files: [FileCreateInput!]!) {
            fileCreate(files: $files) {
              files {
                id
                url
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: { files: [shopifyFile.input] },
      },
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json"
        },
      }
    );

    const responseData = response.data.data.fileCreate;
    if (responseData.userErrors.length > 0) {
      throw new Error(responseData.userErrors.map(error => error.message).join(", "));
    }

    res.status(200).json(responseData.files[0]);
  } catch (error) {
    console.error("Error al subir el archivo a Shopify:", error);
    res.status(500).send("Error al subir el archivo a Shopify");
  }
});

app.listen(3000, () => {
  console.log("Servidor corriendo en el puerto 3000");
});

export default shopify;
export const apiVersion = ApiVersion.April24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
