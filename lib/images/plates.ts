export type PlateAsset = {
  readonly gifSrc: string
  readonly staticSrc: string
  readonly width: number
  readonly height: number
}

export const HOME_PLATE: PlateAsset = {
  gifSrc: "/home.gif",
  staticSrc: "/home-static.png",
  width: 800,
  height: 640,
}

export const BLOG_PLATE: PlateAsset = {
  gifSrc: "/blog.gif",
  staticSrc: "/blog-static.png",
  width: 500,
  height: 296,
}

export const CANARY_PLATE: PlateAsset = {
  gifSrc: "/canary.gif",
  staticSrc: "/canary-static.png",
  width: 500,
  height: 333,
}

export const VERIFY_PLATE: PlateAsset = {
  gifSrc: "/verify.gif",
  staticSrc: "/verify-static.png",
  width: 360,
  height: 360,
}

export const PRIVACY_PLATE: PlateAsset = {
  gifSrc: "/privacy.gif",
  staticSrc: "/privacy-static.png",
  width: 490,
  height: 330,
}

export const NOT_FOUND_PLATE: PlateAsset = {
  gifSrc: "/404.gif",
  staticSrc: "/404-static.png",
  width: 177,
  height: 200,
}

export const ERROR_PLATE: PlateAsset = {
  gifSrc: "/error.gif",
  staticSrc: "/error-static.png",
  width: 500,
  height: 500,
}

export const GLOBAL_ERROR_PLATE: PlateAsset = {
  gifSrc: "/globalerror.gif",
  staticSrc: "/globalerror-static.png",
  width: 212,
  height: 188,
}
