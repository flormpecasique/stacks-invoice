document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("invoice-form");
    const invoiceContainer = document.getElementById("invoice-container");
    const invoiceCanvas = document.getElementById("invoice-canvas");
    const payNowButton = document.getElementById("pay-now");
    const downloadButton = document.getElementById("download-invoice");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Obtener valores del formulario
        const token = document.getElementById("token").value.toUpperCase();
        const amount = document.getElementById("amount").value;
        const description = document.getElementById("description").value;
        const stacksAddress = document.getElementById("stacks-address").value;

        if (!token || !amount || !description || !stacksAddress) {
            alert("Please fill in all fields.");
            return;
        }

        // Crear el enlace de pago con codificación adecuada
        const paymentLink = `stacks://wallet/send?recipient=${encodeURIComponent(stacksAddress)}&amount=${encodeURIComponent(amount)}&memo=${encodeURIComponent(description)}&token=${encodeURIComponent(token)}`;
        console.log("Payment Link:", paymentLink);

        // Generar código QR con mejor tamaño para móviles
        try {
            await QRCode.toCanvas(invoiceCanvas, paymentLink, {
                width: 300,
                margin: 1
            });
        } catch (error) {
            console.error("Error generating QR Code:", error);
            alert("Failed to generate QR code.");
            return;
        }

        // Mostrar la factura
        invoiceContainer.style.display = "block";

        // Asegurar que el botón "Pay Now" redirija correctamente en móvil y escritorio
        payNowButton.onclick = () => {
            window.location.href = paymentLink; // Para móviles
            window.open(paymentLink, "_blank"); // Para escritorio
        };

        // Configurar la descarga de la factura
        downloadButton.onclick = () => {
            downloadInvoice(token, amount, description, stacksAddress, paymentLink);
        };
    });

    // Función para descargar la factura como imagen
    function downloadInvoice(token, amount, description, stacksAddress, paymentLink) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 400;
        canvas.height = 550; // Más espacio para direcciones largas

        // Fondo blanco
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Título con margen superior mejorado
        ctx.fillStyle = "#000";
        ctx.font = "bold 20px Arial";
        ctx.fillText("Stacks Invoice", 130, 60);

        // Datos alineados
        ctx.font = "16px Arial";
        ctx.fillText(`Token: ${token}`, 30, 100);
        ctx.fillText(`Amount: ${amount}`, 30, 130);
        ctx.fillText("Description:", 30, 160);
        ctx.fillText(description, 30, 180);

        // Dirección dividida en varias líneas automáticamente
        ctx.fillText("Address:", 30, 210);
        let addressLines = splitText(ctx, stacksAddress, 340); // Ajusta según el ancho disponible
        addressLines.forEach((line, index) => {
            ctx.fillText(line, 30, 230 + index * 20);
        });

        // Ajustar altura si la dirección es muy larga
        canvas.height += addressLines.length * 20;

        // Dibujar el código QR con más espacio
        const qrCanvas = document.createElement("canvas");
        QRCode.toCanvas(qrCanvas, paymentLink, {
            width: 180,
            margin: 2
        }, function () {
            ctx.drawImage(qrCanvas, 110, 300 + addressLines.length * 10, 180, 180);
            
            // Descargar la factura
            const link = document.createElement("a");
            link.download = `invoice_${stacksAddress}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    }

    // Función para dividir texto largo en líneas dentro de un ancho máximo
    function splitText(ctx, text, maxWidth) {
        let words = text.split(" ");
        let lines = [];
        let currentLine = "";

        words.forEach(word => {
            let testLine = currentLine + (currentLine ? " " : "") + word;
            let testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }
});
