// Server components only: importing this module from client code ships the business draft to the browser.
import business from "@content/business-draft.json";

export * from "./public";
export { business };

export const serviceAreaText = (() => {
  const areas = business.publishedReferences.serviceAreas.filter((area) => area !== "Central Alberta");
  return `${areas.join(", ")} and across Central Alberta`;
})();
