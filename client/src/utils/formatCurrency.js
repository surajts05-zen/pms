// Indian Rupee Formatting Utility
// Format: [$₹][>9999999]##\,##\,##\,##0.00;[$₹][>99999]##\,##\,##0.00;[$₹]##,##0.00

export const formatIndianRupee = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '₹0.00';

    const num = parseFloat(value);
    const isNegative = num < 0;
    const absNum = Math.abs(num);

    let formatted = '';

    if (absNum > 9999999) {
        // Crore format: ##,##,##,##0.00
        formatted = absNum.toFixed(decimals);
        const [intPart, decPart] = formatted.split('.');

        // Group from right: first 3, then groups of 2
        let result = intPart.slice(-3); // Last 3 digits
        let remaining = intPart.slice(0, -3);

        while (remaining.length > 0) {
            if (remaining.length <= 2) {
                result = remaining + ',' + result;
                remaining = '';
            } else {
                result = remaining.slice(-2) + ',' + result;
                remaining = remaining.slice(0, -2);
            }
        }

        formatted = decPart ? `${result}.${decPart}` : result;
    } else if (absNum > 99999) {
        // Lakh format: ##,##,##0.00
        formatted = absNum.toFixed(decimals);
        const [intPart, decPart] = formatted.split('.');

        let result = intPart.slice(-3); // Last 3 digits
        let remaining = intPart.slice(0, -3);

        while (remaining.length > 0) {
            if (remaining.length <= 2) {
                result = remaining + ',' + result;
                remaining = '';
            } else {
                result = remaining.slice(-2) + ',' + result;
                remaining = remaining.slice(0, -2);
            }
        }

        formatted = decPart ? `${result}.${decPart}` : result;
    } else {
        // Thousand format: ##,##0.00
        formatted = absNum.toFixed(decimals);
        const [intPart, decPart] = formatted.split('.');

        // Simple comma separation for thousands
        let result = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = decPart ? `${result}.${decPart}` : result;
    }

    return `${isNegative ? '-' : ''}₹${formatted}`;
};

// Shorthand for integer formatting (no decimals)
export const formatIndianRupeeInt = (value) => {
    return formatIndianRupee(value, 0);
};
