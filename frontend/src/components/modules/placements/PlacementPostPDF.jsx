/* eslint-disable react/prop-types */
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Circle,
  Polygon,
  Rect,
} from "@react-pdf/renderer";
import {
  campusBuildingBg,
  collegeLogo,
  formatPlacementPosterData,
  profileDummy,
} from "./placementPosterUtils";

const NAVY = "#1E4488";
const ORANGE = "#F26522";
const ORANGE_DARK = "#B9430C";

const styles = StyleSheet.create({
  page: {
    width: 400,
    height: 400,
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    fontFamily: "Helvetica",
  },
  bgSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 400,
    height: 400,
  },
  campusWrapper: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 9,
    height: 152,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  campusImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.22,
  },
  campusTopSoftWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  content: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  collegeLogoImg: {
    height: 33,
    width: 148,
    objectFit: "contain",
    objectPosition: "left center",
  },
  deptLogoWide: {
    height: 33,
    width: 112,
    objectFit: "contain",
    objectPosition: "right center",
  },
  deptLogoSquare: {
    height: 38,
    width: 38,
    objectFit: "contain",
  },
  headingBlock: {
    alignItems: "center",
    marginTop: 6,
  },
  congratsTitle: {
    fontSize: 22.5,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 10.5,
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 1.32,
    marginTop: 3,
  },
  photoSection: {
    alignItems: "center",
    marginTop: 8,
  },
  photoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4.5,
    borderColor: ORANGE,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  studentPhoto: {
    width: 101,
    height: 101,
    borderRadius: 50.5,
    objectFit: "cover",
  },
  ribbonContainer: {
    width: 248,
    height: 48,
    marginTop: -17,
    position: "relative",
    alignItems: "center",
  },
  ribbonSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 248,
    height: 48,
  },
  ribbonTextWrap: {
    width: 200,
    height: 35,
    paddingTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  studentNameText: {
    fontSize: 13.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  courseYearText: {
    fontSize: 8.8,
    color: "#FFF7ED",
    textAlign: "center",
    marginTop: 1.5,
  },
  detailsSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginTop: 2,
  },
  familyText: {
    fontSize: 9.8,
    color: "#1F2937",
    textAlign: "center",
  },
  boldInline: {
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  villageText: {
    fontSize: 9.6,
    color: "#1F2937",
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    width: 208,
    height: 0.8,
    backgroundColor: "#64748B",
    marginVertical: 5,
  },
  placedLine: {
    fontSize: 10.2,
    color: "#1F2937",
    textAlign: "center",
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    maxWidth: 348,
  },
  companyLogoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 0.6,
    borderColor: "#E2E8F0",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 24,
  },
  companyLogoImg: {
    height: 17,
    maxWidth: 68,
    objectFit: "contain",
  },
  companyFallbackBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    width: 24,
    height: 24,
    borderWidth: 0.6,
    borderColor: "#CBD5E1",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  companyFallbackLetter: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  companyHeadline: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "left",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 9,
    flexDirection: "row",
  },
  bottomBarLeft: {
    width: "58%",
    height: 9,
    backgroundColor: "#F68B1F",
  },
  bottomBarRight: {
    width: "42%",
    height: 9,
    backgroundColor: "#EE4B22",
  },
});

const PlacementPostPDF = ({
  student,
  companyMap = {},
  disableRemoteStudentImage = false,
  disableCompanyLogo = false,
}) => {
  const poster = formatPlacementPosterData(student, companyMap);
  const studentImgSrc = disableRemoteStudentImage ? profileDummy : poster.studentImage;
  const showCompanyLogo = Boolean(poster.companyLogo) && !disableCompanyLogo;

  return (
    <Document>
      <Page size={{ width: 400, height: 400 }} style={styles.page}>
        {/* Decorative light slate-blue arcs */}
        <Svg viewBox="0 0 400 400" style={styles.bgSvg}>
          <Circle cx="18" cy="14" r="98" fill="none" stroke="#EEF2F8" strokeWidth={44} />
          <Circle cx="374" cy="218" r="76" fill="none" stroke="#EEF2F8" strokeWidth={30} />
        </Svg>

        {/* Bottom faded campus building background */}
        <View style={styles.campusWrapper}>
          <Image src={campusBuildingBg} style={styles.campusImg} />
          <View style={styles.campusTopSoftWash} />
        </View>

        {/* Main poster layout */}
        <View style={styles.content}>
          {/* Top Logo Header: Left College Logo | Right Dynamic Department Logo */}
          <View style={styles.logoRow}>
            <Image src={collegeLogo} style={styles.collegeLogoImg} />
            <Image
              src={poster.department.logo}
              style={
                poster.department.isSquareLogo ? styles.deptLogoSquare : styles.deptLogoWide
              }
            />
          </View>

          {/* Heading */}
          <View style={styles.headingBlock}>
            <Text style={styles.congratsTitle}>Congratulations</Text>
            <Text style={styles.subtitleText}>
              We are proud to announce that{"\n"}our {poster.department.label} student
            </Text>
          </View>

          {/* Student Photo + Overlapping 3D Notched Ribbon */}
          <View style={styles.photoSection}>
            <View style={styles.photoCircle}>
              <Image src={studentImgSrc} style={styles.studentPhoto} />
            </View>

            <View style={styles.ribbonContainer}>
              <Svg viewBox="0 0 260 56" style={styles.ribbonSvg}>
                <Polygon points="0,12 36,12 36,52 0,52 14,32" fill={ORANGE} />
                <Polygon points="260,12 224,12 224,52 260,52 246,32" fill={ORANGE} />
                <Polygon points="22,42 36,42 36,52" fill={ORANGE_DARK} />
                <Polygon points="238,42 224,42 224,52" fill={ORANGE_DARK} />
                <Rect x="22" y="2" width="216" height="40" fill={ORANGE} />
              </Svg>
              <View style={styles.ribbonTextWrap}>
                <Text style={styles.studentNameText}>{poster.fullName}</Text>
                {poster.courseYearLabel ? (
                  <Text style={styles.courseYearText}>{poster.courseYearLabel}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Parent, Hometown, Role & Company Details */}
          <View style={styles.detailsSection}>
            {poster.fatherDisplay ? (
              <Text style={styles.familyText}>
                {poster.relationPrefix}{" "}
                <Text style={styles.boldInline}>{poster.fatherDisplay}</Text>
              </Text>
            ) : null}

            {poster.locationPlace ? (
              <Text style={styles.villageText}>
                from <Text style={styles.boldInline}>{poster.locationPlace}</Text>
              </Text>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.placedLine}>
              has been placed as a{" "}
              <Text style={styles.boldInline}>{poster.jobProfile}</Text> at
            </Text>

            <View style={styles.companyRow}>
              {showCompanyLogo ? (
                <View style={styles.companyLogoBox}>
                  <Image src={poster.companyLogo} style={styles.companyLogoImg} />
                </View>
              ) : (
                <View style={styles.companyFallbackBox}>
                  <Text style={styles.companyFallbackLetter}>
                    {poster.companyName?.charAt(0)?.toUpperCase() || "C"}
                  </Text>
                </View>
              )}
              <Text style={styles.companyHeadline}>{poster.companyHeadline}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Two-Tone Orange Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarLeft} />
          <View style={styles.bottomBarRight} />
        </View>
      </Page>
    </Document>
  );
};

export default PlacementPostPDF;
