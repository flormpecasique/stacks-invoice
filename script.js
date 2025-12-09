document.getElementById("invoice-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const token = document.getElementById("token").value;
    let amount = document.getElementById("amount").value.replace(",", "."); // Soporta decimales
    const description = document.getElementById("description").value;
    let stacksAddress = document.getElementById("stacks-address").value.trim();
    let bnsName = "";

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        alert("Enter a valid amount.");
        return;
    }

    // Resolver BNS a dirección STX
    if (stacksAddress.endsWith(".btc")) {
        try {
            const response = await fetch(`https://api.hiro.so/v1/names/${stacksAddress.toLowerCase()}`);
            const data = await response.json();
            if (data.address) {
                bnsName = stacksAddress;
                stacksAddress = data.address;
            } else {
                alert("Invalid BNS name.");
                return;
            }
        } catch (error) {
            alert("Error resolving BNS.");
            return;
        }
    }

    await generateInvoice(token, amount, description, stacksAddress, bnsName);
});

async function generateInvoice(token, amount, description, stacksAddress, bnsName) {
    const invoiceContainer = document.getElementById("invoice-container");
    invoiceContainer.style.display = "block";
    invoiceContainer.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texto
    ctx.fillStyle = "#000";
    ctx.textAlign = "left";

    ctx.font = "bold 20px Arial";
    ctx.fillText("Stacks Invoice Ӿ", 120, 50);

    ctx.font = "13px Arial";
    ctx.fillText(`Token: ${token}`, 30, 100);
    ctx.fillText(`Amount: ${amount}`, 30, 140);
    ctx.fillText(`Description:`, 30, 180);
    ctx.fillText(description, 30, 210);

    const fullAddress = bnsName ? `${stacksAddress} (${bnsName})` : stacksAddress;
    const maxWidth = 340;
    const addressLines = breakText(ctx, `Address: ${fullAddress}`, maxWidth);
    addressLines.forEach((line, index) => {
        ctx.fillText(line, 30, 250 + index * 20);
    });

    try {
        // Crear link StacksPay
        const stacksPayLink = `web+stx:stxpay?recipient=${stacksAddress}&amount=${parseFloat(amount) * 1000000}&token=${token}&memo=${encodeURIComponent(description)}`;

        // Generar QR del link
        const qrCanvas = await generateQRCode(stacksPayLink);
        ctx.drawImage(qrCanvas, 100, 350, 200, 200);

        // Imagen final de la factura
        const img = new Image();
        img.src = canvas.toDataURL();
        img.style.width = "100%";
        invoiceContainer.appendChild(img);

        // Botones
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "buttons-container";

        // Pay Now
        const payNowBtn = document.createElement("button");
        payNowBtn.textContent = "Pay Now";
        payNowBtn.id = "pay-now";
        payNowBtn.onclick = function () {
            window.open(stacksPayLink, "_blank"); // Abre wallet compatible
        };

        // Download Invoice
        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "Download Invoice";
        downloadBtn.id = "download-invoice";
        downloadBtn.onclick = function () {
            const link = document.createElement("a");
            link.download = "stacks-invoice.png";
            link.href = img.src;
            link.click();
        };

        buttonsContainer.appendChild(payNowBtn);
        buttonsContainer.appendChild(downloadBtn);
        invoiceContainer.appendChild(buttonsContainer);

    } catch (error) {
        console.error("Error generating QR code:", error);
        alert("Error generating QR code. Please try again.");
    }
}

// Función para generar QR
function generateQRCode(data) {
    return new Promise((resolve, reject) => {
        QRCode.toCanvas(data, { width: 200 }, function (error, qrCanvas) {
            if (error) reject(error);
            else resolve(qrCanvas);
        });
    });
}

// Función para dividir texto largo en líneas
function breakText(ctx, text, maxWidth) {
    const words = text.split(" ");
    let lines = [];
    let line = "";
    for (let word of words) {
        let testLine = line + word + " ";
        let testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth) {
            lines.push(line);
            line = word + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    return lines;
}
