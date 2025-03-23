document.getElementById("generate-invoice").addEventListener("click", function () {
    const token = document.getElementById("token").value;
    const amount = document.getElementById("amount").value;
    const description = document.getElementById("description").value;
    const address = document.getElementById("address").value;

    if (!token || !amount || !address) {
        alert("Please fill in all required fields.");
        return;
    }

    // Obtener la dirección Stacks si se ingresó un BNS
    fetch(`https://api.hiro.so/v1/names/${address}`)
        .then(response => response.json())
        .then(data => {
            const stacksAddress = data.address || address; // Si no es BNS, usa la dirección tal cual

            // Mostrar la factura en pantalla
            const invoiceHtml = `
                <h2>Stacks Invoice</h2>
                <p><strong>Token:</strong> ${token}</p>
                <p><strong>Amount:</strong> ${amount}</p>
                <p><strong>Description:</strong><br>${description}</p>
                <p><strong>Address:</strong><br>${stacksAddress}</p>
                <div id="qrcode"></div>
            `;
            document.getElementById("invoice-container").innerHTML = invoiceHtml;

            // Generar el código QR con la dirección Stacks sin enlaces
            const qrCodeDiv = document.getElementById("qrcode");
            qrCodeDiv.innerHTML = "";
            new QRCode(qrCodeDiv, {
                text: stacksAddress,
                width: 180,
                height: 180,
            });

            // Guardar datos para la descarga de imagen
            document.getElementById("download-invoice").dataset.invoice = JSON.stringify({
                token,
                amount,
                description,
                address: stacksAddress
            });
        })
        .catch(() => alert("Failed to resolve BNS. Please enter a valid Stacks address or BNS."));
});

// Descargar la factura en imagen
document.getElementById("download-invoice").addEventListener("click", function () {
    const data = JSON.parse(this.dataset.invoice || "{}");

    if (!data.token || !data.amount || !data.address) {
        alert("Generate the invoice first.");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.font = "bold 24px Arial";
    ctx.fillText("Stacks Invoice", 20, 50);

    ctx.font = "18px Arial";
    ctx.fillText(`Token: ${data.token}`, 20, 100);
    ctx.fillText(`Amount: ${data.amount}`, 20, 140);
    ctx.fillText("Description:", 20, 180);
    ctx.fillText(data.description, 20, 210);
    ctx.fillText("Address:", 20, 250);

    // Ajustar dirección en varias líneas si es larga
    const addressLines = splitTextIntoLines(ctx, data.address, 450);
    addressLines.forEach((line, i) => {
        ctx.fillText(line, 20, 280 + i * 25);
    });

    // Generar QR en canvas
    const qrCanvas = document.createElement("canvas");
    new QRCode(qrCanvas, {
        text: data.address,
        width: 180,
        height: 180,
    });

    const qrImg = new Image();
    qrImg.src = qrCanvas.toDataURL("image/png");
    qrImg.onload = function () {
        ctx.drawImage(qrImg, 160, 350, 180, 180);
        const img = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = img;
        link.download = `invoice_${data.address}.png`;
        link.click();
    };
});

// Función para dividir texto largo en líneas ajustadas al ancho
function splitTextIntoLines(ctx, text, maxWidth) {
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";

    for (let word of words) {
        let testLine = currentLine ? `${currentLine} ${word}` : word;
        let testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

// Botón de pago con Xverse o Leather
document.getElementById("pay-now").addEventListener("click", function () {
    const address = document.getElementById("address").value;
    const amount = document.getElementById("amount").value;
    const token = document.getElementById("token").value;

    if (!address || !amount || !token) {
        alert("Generate the invoice first.");
        return;
    }

    // Construir la URL de pago
    const paymentUrl = `https://www.hiro.so/wallet/send?recipient=${address}&amount=${amount}&token=${token}`;
    window.open(paymentUrl, "_blank");
});
