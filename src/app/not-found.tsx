import { MsfNotFound, msfNotFoundMetadata } from "@/components/school/MsfNotFound";

// The ROOT 404 is MySchoolFrame's (2026-09-28). Every unknown address on
// myschoolframe.com lands here, and it used to be the holiday storefront's
// sticker page, whose button went to /build. Same page as /school's own 404.
export const metadata = msfNotFoundMetadata;

export default MsfNotFound;
