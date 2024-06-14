import React, { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  CalloutCard,
  BlockStack,
  Box,
  List,
  Link,
  Button,
  Thumbnail,
  IndexTable,
  LegacyCard,
  Badge,
  useBreakpoints,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      orders(first: 10) {
        edges {
          node {
            id
            name
            email
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  customAttributes {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `);
  const responseJson = await response.json();
  const orders = responseJson.data.orders.edges.map((edge) => edge.node);

  return json({ orders });
};

export default function Index() {
  const { orders } = useLoaderData();
  const shopify = useAppBridge();
  const [host, setHost] = useState("");
  const [pdfUrls, setPdfUrls] = useState({});

  useEffect(() => {
    if (shopify) {
      setHost(shopify.host);
    }
  }, [shopify]);

  const getCustomAttribute = (attributes, key) => {
    const attribute = attributes.find((attr) => attr.key === key);
    return attribute ? attribute.value : "N/A";
  };

  const convertImageToBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg");
        resolve(dataURL);
      };
      img.onerror = (err) => reject(err);
    });
  };

  const convertImagesToBase64 = (imageUrls) => {
    return Promise.all(imageUrls.map((url) => convertImageToBase64(url)));
  };

  const generatePDF = async (order) => {
    console.log("Generando PDF para la orden:", order.name);

    try {
      const html2pdf = (await import("html2pdf.js/dist/html2pdf.bundle.min.js"))
        .default;

      // Extraer URLs de las imágenes
      const imageUrls = order.lineItems.edges
        .map(({ node }) => getCustomAttribute(node.customAttributes, "Avatar"))
        .filter((url) => url !== "N/A");

      // Convertir todas las imágenes a base64
      const base64Images = await convertImagesToBase64(imageUrls);

      // Crear un map de URLs originales a base64
      const imageMap = {};
      imageUrls.forEach((url, index) => {
        imageMap[url] = base64Images[index];
      });

      const styleHashtags = (message) => {
        return message.replace(/#(\w+)/g, '<span style="color: #1DA1F2;">#$1</span>');
      };

      const contentToConvert = `${order.lineItems.edges
        .map(
          ({ node }) => `
        <div style="
                  background: #fff;
                  height: fit-content;
                  width: 100%;
                  padding: 22px 50px;
                  border-radius: 30px;
                  box-shadow: -4px 9px 15px #5b5656;
                ">
  <div style=" display: flex; justify-content: flex-start;">
    <div class="img-container" style="width: 15%;text-align:center;">
      <img id="avatar-preview"
        src="${imageMap[getCustomAttribute(node.customAttributes, "Avatar")]}"
        alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%;">
    </div>
    <div class="nickname-container" style="width: 75%;">
      <div class="name-verificaded" style="display: flex; width: 300px; justify-content:start;align-items: center;">
        <p id="username-preview" style="margin: 0;margin-right: 5px; font-weight: bold;font-size: 18px; color:#000;">
         ${getCustomAttribute(node.customAttributes, "Nombre de usuario")}
        </p>
        <svg style="" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"
          fill="#0095F6">
          <g data-name="21. Verified" id="_21._Verified">
            <path
              d="M22.51,13.76a3,3,0,0,1,0-3.52l.76-1.05a1,1,0,0,0,.14-.9,1.018,1.018,0,0,0-.64-.64l-1.23-.4A2.987,2.987,0,0,1,19.47,4.4V3.1a1,1,0,0,0-1.31-.95l-1.24.4a3,3,0,0,1-3.35-1.09L12.81.41a1.036,1.036,0,0,0-1.62,0l-.76,1.05A3,3,0,0,1,7.08,2.55l-1.24-.4a1,1,0,0,0-1.31.95V4.4A2.987,2.987,0,0,1,2.46,7.25l-1.23.4a1.018,1.018,0,0,0-.64.64,1,1,0,0,0,.14.9l.76,1.05a3,3,0,0,1,0,3.52L.73,14.81a1,1,0,0,0-.14.9,1.018,1.018,0,0,0,.64.64l1.23.4A2.987,2.987,0,0,1,4.53,19.6v1.3a1,1,0,0,0,1.31.95l1.23-.4a2.994,2.994,0,0,1,3.36,1.09l.76,1.05a1.005,1.005,0,0,0,1.62,0l.76-1.05a3,3,0,0,1,3.36-1.09l1.23.4a1,1,0,0,0,1.31-.95V19.6a2.987,2.987,0,0,1,2.07-2.85l1.23-.4a1.018,1.018,0,0,0,.64-.64,1,1,0,0,0-.14-.9Zm-5.8-3.053-5,5a1,1,0,0,1-1.414,0l-3-3a1,1,0,1,1,1.414-1.414L11,13.586l4.293-4.293a1,1,0,0,1,1.414,1.414Z" />
          </g>
        </svg>
      </div>
    </div>
    <div class="dots" style="width:10%">
      <svg width="16px" height="16px" viewBox="0 0 16 16" class="bi bi-three-dots" fill="currentColor"
        xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd"
          d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
      </svg>
    </div>
  </div>
  <div class="" style="">
    <p id="message-preview" style="word-wrap: break-word; overflow-wrap: break-word; color:#000;padding: 10px 0;">
       ${styleHashtags(getCustomAttribute(node.customAttributes, "Mensaje"))}
    </p>
  </div>
  <div class="iconos" style="
                    border-top: 1px solid #838383;
                    padding-top:5px;
                    display: flex;
                    justify-content: space-between;
                  ">
    <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 1024 1024" height="21" width="21" fill="#838383">
      <path
        d="M464 512a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm200 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm-400 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm661.2-173.6c-22.6-53.7-55-101.9-96.3-143.3a444.35 444.35 0 0 0-143.3-96.3C630.6 75.7 572.2 64 512 64h-2c-60.6.3-119.3 12.3-174.5 35.9a445.35 445.35 0 0 0-142 96.5c-40.9 41.3-73 89.3-95.2 142.8-23 55.4-34.6 114.3-34.3 174.9A449.4 449.4 0 0 0 112 714v152a46 46 0 0 0 46 46h152.1A449.4 449.4 0 0 0 510 960h2.1c59.9 0 118-11.6 172.7-34.3a444.48 444.48 0 0 0 142.8-95.2c41.3-40.9 73.8-88.7 96.5-142 23.6-55.2 35.6-113.9 35.9-174.5.3-60.9-11.5-120-34.8-175.6zm-151.1 438C704 845.8 611 884 512 884h-1.7c-60.3-.3-120.2-15.3-173.1-43.5l-8.4-4.5H188V695.2l-4.5-8.4C155.3 633.9 140.3 574 140 513.7c-.4-99.7 37.7-193.3 107.6-263.8 69.8-70.5 163.1-109.5 262.8-109.9h1.7c50 0 98.5 9.7 144.2 28.9 44.6 18.7 84.6 45.6 119 80 34.3 34.3 61.3 74.4 80 119 19.4 46.2 29.1 95.2 28.9 145.8-.6 99.6-39.7 192.9-110.1 262.7z" />
    </svg>
    <svg width="21" version="1.1" xmlns="http://www.w3.org/2000/svg" height="21" viewBox="0 0 64 64"
      xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 64 64">
      <g>
        <g fill="#838383">
          <path
            d="m15.486,25.515c0.398,0.454 0.952,0.687 1.507,0.687 0.478,0 0.958-0.172 1.345-0.518 0.832-0.75 0.906-2.043 0.165-2.887l-7.488-8.528c-0.014-0.015-0.032-0.021-0.046-0.034-0.029-0.031-0.057-0.06-0.088-0.088-0.016-0.015-0.02-0.033-0.035-0.047-0.073-0.066-0.163-0.09-0.241-0.144-0.093-0.062-0.177-0.142-0.275-0.187-0.037-0.018-0.075-0.027-0.112-0.041-0.108-0.041-0.219-0.052-0.331-0.074-0.108-0.021-0.211-0.057-0.323-0.06-0.021-0.001-0.038-0.012-0.058-0.012s-0.037,0.011-0.058,0.012c-0.112,0.003-0.217,0.038-0.327,0.06-0.112,0.022-0.221,0.033-0.327,0.074-0.037,0.014-0.074,0.023-0.11,0.041-0.101,0.045-0.184,0.124-0.278,0.187-0.08,0.054-0.171,0.078-0.244,0.144-0.016,0.015-0.02,0.034-0.035,0.049-0.03,0.027-0.058,0.056-0.085,0.086-0.014,0.014-0.031,0.02-0.046,0.034l-7.486,8.528c-0.741,0.844-0.666,2.137 0.168,2.887 0.385,0.346 0.863,0.518 1.34,0.518 0.557,0 1.11-0.232 1.509-0.687l3.96-4.511v23.445c0,3.383 2.717,6.134 6.058,6.134h29.14c1.115,0 2.019-0.915 2.019-2.044 0-1.13-0.903-2.045-2.019-2.045h-29.14c-1.115,0-2.02-0.918-2.02-2.045v-23.445l3.961,4.511z" />
          <path
            d="m60.473,38.652l-3.959,4.51v-23.445c0-3.383-2.718-6.134-6.058-6.134h-28.415c-1.117,0-2.02,0.915-2.02,2.044 0,1.13 0.902,2.045 2.02,2.045h28.415c1.115,0 2.02,0.918 2.02,2.045v23.445l-3.962-4.51c-0.742-0.844-2.016-0.92-2.852-0.168-0.832,0.75-0.906,2.043-0.166,2.886l7.489,8.527c0.012,0.015 0.032,0.019 0.044,0.032 0.029,0.032 0.059,0.062 0.09,0.092 0.014,0.013 0.02,0.031 0.035,0.045 0.095,0.084 0.206,0.125 0.309,0.189 0.033,0.021 0.062,0.048 0.1,0.066 0.047,0.025 0.085,0.07 0.134,0.092 0.018,0.008 0.037,0.01 0.055,0.018 0.241,0.096 0.49,0.151 0.744,0.151 0.251,0 0.504-0.055 0.743-0.151 0.018-0.008 0.037-0.01 0.056-0.018 0.049-0.021 0.086-0.065 0.131-0.09 0.033-0.019 0.059-0.044 0.091-0.062 0.109-0.064 0.226-0.109 0.321-0.195 0.016-0.015 0.02-0.034 0.035-0.049 0.03-0.028 0.058-0.058 0.087-0.088 0.012-0.014 0.031-0.018 0.043-0.032l7.488-8.527c0.74-0.843 0.665-2.136-0.169-2.886-0.835-0.752-2.11-0.675-2.849,0.168z" />
        </g>
      </g>
    </svg>
    <svg style="enable-background: new 0 0 512 512" version="1.1" viewBox="0 0 512 512" height="21" width="21"
      xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g id="_x31_66_x2C__Heart_x2C__Love_x2C__Like_x2C__Twitter">
        <g>
          <path
            d="M365.4,59.628c60.56,0,109.6,49.03,109.6,109.47c0,109.47-109.6,171.8-219.06,281.271    C146.47,340.898,37,278.568,37,169.099c0-60.44,49.04-109.47,109.47-109.47c54.73,0,82.1,27.37,109.47,82.1    C283.3,86.999,310.67,59.628,365.4,59.628z"
            style="fill: #da2841" />
        </g>
      </g>
      <g id="Layer_1" />
    </svg>
    <svg data-name="Livello 1" id="Livello_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" height="21"
      width="21" fill="#838383">
      <title />
      <path
        d="M37.09,32.91A3,3,0,0,0,39.21,32L61,10.24V91a3,3,0,0,0,6,0V10.24L88.79,32A3,3,0,0,0,93,27.79L66.12.88A3,3,0,0,0,65.66.5L65.43.38a3,3,0,0,0-.29-.15,3,3,0,0,0-.31-.1L64.59.06a3,3,0,0,0-1.18,0l-.25.08a2.93,2.93,0,0,0-.31.1,3,3,0,0,0-.29.15L62.34.5a3,3,0,0,0-.46.38L35,27.79a3,3,0,0,0,2.12,5.12Z" />
      <path
        d="M125,88a3,3,0,0,0-3,3v22a9,9,0,0,1-9,9H15a9,9,0,0,1-9-9V91a3,3,0,0,0-6,0v22a15,15,0,0,0,15,15h98a15,15,0,0,0,15-15V91A3,3,0,0,0,125,88Z" />
    </svg>
  </div>
</div>`,
        )
        .join("")}
    `;

      console.log("contenido del pdf: ", contentToConvert);

      const options = {
        margin: 0.5,
        filename: `order_${order.id}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      // Convertir contenido HTML a PDF
      html2pdf()
        .set(options)
        .from(contentToConvert)
        .toPdf()
        .save()
        .catch((error) => {
          console.error("Error al generar PDF:", error);
        });
    } catch (error) {
      console.error("Error al importar html2pdf:", error);
    }
  };

  return (
    <Page>
      <TitleBar title="Create PDF" />
      <BlockStack>
        <Layout>
          <Layout.Section>
            <Card>
              <IndexTable
              className="custom-index-table"
                condensed={useBreakpoints().smDown}
                itemCount={orders.length}
                headings={[
                  { title: "Order" },
                  { title: "Date" },
                  { title: "Customer" },
                  { title: "Total", alignment: "end" },
                  
                ]}
                selectable={false}
              >
                {orders.map((order) => (
                  <IndexTable.Row key={order.id}>
                    <IndexTable.Cell>
                      <Link
                        url={`https://${host}/admin/orders/${order.id}`}
                        external
                      >
                        {order.name}
                      </Link>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{order.createdAt}</IndexTable.Cell>
                    <IndexTable.Cell>{order.email}</IndexTable.Cell>

                    <IndexTable.Cell>
                      {order.lineItems.edges.map(({ node }) => (
                        <div key={node.title}>
                          <CalloutCard
                            title={getCustomAttribute(
                              node.customAttributes,
                              "Nombre de usuario",
                            )}
                            illustration={getCustomAttribute(
                              node.customAttributes,
                              "Avatar",
                              )}
                            
                            primaryAction={{
                              content: "Generar PDF",
                              onAction: () => generatePDF(order),
                            }}
                          >
                            <Text as="p">
                            Mensaje:{" "}
                            {getCustomAttribute(
                              node.customAttributes,
                              "Mensaje",
                            )}
                          </Text>
                          </CalloutCard>
                         
                        </div>
                      ))}
                    </IndexTable.Cell>
                    
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
