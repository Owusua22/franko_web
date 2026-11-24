import { peekPublicRead } from "../utils/publicReadCache";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getHomePageAdvertisment } from "../Redux/Slice/advertismentSlice";
import { adImageUrl } from "../config/media";

/** The CMS exports every in-page banner at 1600x645. */
const AD_WIDTH = 1600;
const AD_HEIGHT = 645;

const InfoBanner = () => {
  const dispatch = useDispatch();
  const { advertisments } = useSelector((state) => state.advertisment);
  const targetFileId = "dceed369-a7fe-4058-8e62-5ab61df74514";

  const [homePageAd, setHomePageAd] = useState(() => {
    const response = peekPublicRead({ endpoint: '/Advertisement/GetAdvertisment', AdsName: 'Home Page' });
    const rows = Array.isArray(response?.data) ? response.data : response?.data?.data;
    return (Array.isArray(rows) ? rows : []).find(ad => ad.fileId === targetFileId) || null;
  });

  useEffect(() => {
    dispatch(getHomePageAdvertisment("Home Page"));
  }, [dispatch]);

  useEffect(() => {
    const matchingAd = (Array.isArray(advertisments) ? advertisments : []).find((ad) => ad.fileId === targetFileId);
    if (matchingAd) {
      setHomePageAd(matchingAd);
    }
  }, [advertisments]);

  const imageUrl = adImageUrl(homePageAd?.fileName, { width: AD_WIDTH });
  const link = homePageAd?.adsNote;
  const alt = homePageAd?.altText || "Franko Trading promotion";

  /* The banner used to be `<img class="w-full h-auto">` with no intrinsic size
     and no placeholder, so the page reserved zero height for it and then
     shifted by the full banner height when the 1600x645 JPEG landed - one of
     the biggest single sources of the 0.27 CLS. It now reserves the exact
     aspect ratio up front and stays out of the initial fetch. */
  const media = (
    <img
      src={imageUrl}
      alt={alt}
      width={AD_WIDTH}
      height={AD_HEIGHT}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      style={{ width: "100%", height: "auto", aspectRatio: `${AD_WIDTH} / ${AD_HEIGHT}` }}
      className="block object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );

  return (
    <div className="mx-auto px-4 md:px-8 mt-3">
      {link ? (
        <a
          href={link}
          className="block relative overflow-hidden rounded-lg shadow-lg group"
          aria-label={`${alt} - open promotion`}
        >
          {media}
        </a>
      ) : (
        <div className="block relative overflow-hidden rounded-lg shadow-lg group">{media}</div>
      )}
    </div>
  );
};

export default InfoBanner;
