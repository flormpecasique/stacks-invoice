document.getElementById("invoice-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const token = document.getElementById("token").value;
    const amount = document.getElementById("amount").value;
    const description = document.getElementById("description").value;
    const stacksAddress = document.getElementById("stacks-address").value;

    if (!token || !amount || !description || !stacksAddress) {
        alert("Please fill in all fields.");
        return;
    }

    // Generar factura en pantalla
    generateInvoiceOnScreen(token, amount, description, stacksAddress);
});

function generateInvoiceOnScreen(token, amount, description, stacksAddress) {
    const canvas = document.getElementById("invoice-canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 600;
    canvas.height = 400;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000";
    ctx.font = "24px Arial";
    ctx.fillText("Stacks Invoice", 130, 80);

    ctx.font = "18px Arial";
    ctx.fillText("Token: " + token.toUpperCase(), 20, 130);
    ctx.fillText("Amount: " + amount, 20, 170);
    ctx.fillText("Description: " + description, 20, 210);
    
    // Dirección Stacks ajustada para no cortarse
    ctx.font = "16px Arial";
    const maxWidth = 560; // Máximo ancho permitido para la dirección
    wrapText(ctx, "Stacks Address: " + stacksAddress, 20, 250, maxWidth, 20);

    // Generar QR solo con la dirección Stacks en texto plano
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, stacksAddress, { width: 100 }, function (error) {
        if (error) console.error(error);
        ctx.drawImage(qrCanvas, 400, 130, 120, 120);
    });

    document.getElementById("invoice-container").style.display = "block";

    // Configurar botón "Pagar ahora"
    const payNowButton = document.getElementById("pay-now");
    payNowButton.onclick = function () {
        const paymentUrl = `stacks://wallet/send?recipient=${encodeURIComponent(stacksAddress)}&amount=${amount}&memo=${encodeURIComponent(description)}&token=${token}`;
        window.location.href = paymentUrl;
    };

    // Configurar botón "Descargar factura"
    document.getElementById("download-invoice").onclick = function () {
        const link = document.createElement("a");
        link.download = "stacks-invoice.png";
        link.href = canvas.toDataURL();
        link.click();
    };
}

// Función para envolver texto si la dirección Stacks es larga
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i] + " ";
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}
