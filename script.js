document.getElementById("invoice-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const token = document.getElementById("token").value;
    const amount = document.getElementById("amount").value;
    const description = document.getElementById("description").value;
    let stacksAddress = document.getElementById("stacks-address").value.trim();

    if (!token || !amount || !description || !stacksAddress) {
        alert("Please fill in all fields.");
        return;
    }

    // Si es un BNS (flor.btc), buscar la dirección Stacks asociada
    if (stacksAddress.endsWith(".btc")) {
        stacksAddress = await resolveBNS(stacksAddress);
        if (!stacksAddress) {
            alert("Error: Could not resolve BNS address.");
            return;
        }
    }

    // Generar la factura en pantalla
    generateInvoiceOnScreen(token, amount, description, stacksAddress);
});

// Función para resolver BNS a dirección Stacks
async function resolveBNS(bnsName) {
    try {
        const response = await fetch(`https://api.hiro.so/v1/names/${bnsName}`);
        const data = await response.json();
        return data.address || null;
    } catch (error) {
        console.error("BNS resolution error:", error);
        return null;
    }
}

// Función para generar la factura en pantalla
function generateInvoiceOnScreen(token, amount, description, stacksAddress) {
    const canvas = document.getElementById("invoice-canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 600;
    canvas.height = 400;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000";
    ctx.font = "26px Arial";
    ctx.fillText("Stacks Invoice", 200, 60);

    ctx.font = "18px Arial";
    ctx.fillText("Token:", 20, 110);
    ctx.fillText(token.toUpperCase(), 150, 110);

    ctx.fillText("Amount:", 20, 150);
    ctx.fillText(amount, 150, 150);

    ctx.fillText("Description:", 20, 190);
    wrapText(ctx, description, 150, 190, 400, 20);

    ctx.fillText("Stacks Address:", 20, 230);
    wrapText(ctx, stacksAddress, 150, 230, 400, 20);

    // Generar QR solo con la dirección Stacks en texto plano
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, stacksAddress, { width: 100 }, function (error) {
        if (error) console.error(error);
        ctx.drawImage(qrCanvas, 400, 100, 120, 120);
    });

    document.getElementById("invoice-container").style.display = "block";

    // Configurar botón "Pagar ahora"
    document.getElementById("pay-now").onclick = function () {
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

// Función para envolver texto y evitar que se corte en la factura
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
