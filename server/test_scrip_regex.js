// Pure logic test
// AND another one that actually hits the local API if running.
// Let's test the regex logic isolated first as it's the core.

const extractScrip = (description) => {
    if (!description) return null;

    let scrip = null;
    const cleanDesc = description.toUpperCase().replace(/[^A-Z0-9\s\/\-]/g, ' ');

    // Pattern 1: Word before "DIVIDEND" or "DIV"
    const divMatch = cleanDesc.match(/([A-Z0-9]+)\s+(?:DIVIDEND|DIV)\b/);
    if (divMatch) {
        scrip = divMatch[1];
    }
    else {
        const commonScrips = ['HDFCBANK', 'RELIANCE', 'ITC', 'TCS', 'INFY', 'SBIN', 'ICICIBANK', 'VEDL', 'POWERGRID', 'COALINDIA'];
        for (const s of commonScrips) {
            if (cleanDesc.includes(s)) {
                scrip = s;
                break;
            }
        }
    }

    if (scrip) {
        if (scrip.length < 3) return null;
        if (['ACH', 'CMS', 'NEFT', 'RTGS', 'UPI'].includes(scrip)) return null;
    }

    return scrip;
};

const testCases = [
    "ACH C- HDFCBANK DIVIDEND",
    "CMS/ 345345/ RELIANCE DIV",
    "NEFT- ... - ITC - DIVIDEND PAYMENT",
    "UPI payment to friend",
    "POWERGRID INTERIM DIVIDEND",
    "ACH C- UNKNOWN BANK"
];

console.log("Testing Extraction Logic:");
testCases.forEach(desc => {
    console.log(`"${desc}" -> ${extractScrip(desc)}`);
});
