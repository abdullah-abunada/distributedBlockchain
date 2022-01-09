class Course {

    constructor(courseID, sectionNum, finalMark) {
        this.courseID = courseID;
        this.sectionNum = sectionNum;
        this.finalMark = finalMark;
    }

    /**
     * get course final mark
     * @returns {number}
     */
    getFinalMark() {
        return parseInt(this.finalMark);
    }
}

module.exports.Course = Course;