const v4Fingerprint = /^[0-9A-F]{40}$/i
const tokenSerial = /^[0-9A-F]{8,}$/i

const insertCard = "insert the canary YubiKey and try again"

function colonRecords(listing: string): string[][] {
  return listing.split("\n").map((line) => line.split(":"))
}

function fprFields(listing: string): string[][] {
  return colonRecords(listing).filter((parts) => parts[0] === "fpr")
}

export function signingFingerprintFromCard(status: string): string {
  const records = fprFields(status)
  if (records.length === 0) {
    throw new Error(
      `Could not read an OpenPGP card status from gpg; ${insertCard}`
    )
  }

  for (const parts of records) {
    const signing = parts[1]
    if (signing && v4Fingerprint.test(signing)) {
      return signing.toUpperCase()
    }
  }

  throw new Error(`The OpenPGP card has no signature key; ${insertCard}`)
}

export function cardSerialForKey(listing: string, key: string): string {
  const wanted = key.toUpperCase()
  let secret: string[] | undefined

  for (const parts of colonRecords(listing)) {
    const type = parts[0]
    if (type === "sec" || type === "ssb") {
      secret = parts
      continue
    }

    if (type !== "fpr" || secret === undefined) {
      continue
    }

    const fingerprint = parts[9]
    if (!fingerprint || fingerprint.toUpperCase() !== wanted) {
      secret = undefined
      continue
    }

    const serial = secret[14]
    if (serial && tokenSerial.test(serial)) {
      return serial.toUpperCase()
    }

    throw new Error(
      `The secret key ${wanted} is not held on an OpenPGP card; ${insertCard}`
    )
  }

  throw new Error(`gpg has no secret key for ${wanted}; ${insertCard}`)
}
