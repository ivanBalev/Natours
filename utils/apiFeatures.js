class APIFeatures {
  constructor(dbQuery, requestQueryObject) {
    this.dbQuery = dbQuery;
    this.requestQueryObject = requestQueryObject;
  }

  filter() {
    const queryObj = { ...this.requestQueryObject };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // delete operator in JS - interesting
    // Other option from YT project - map query object to another object
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.dbQuery = this.dbQuery.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.requestQueryObject.sort) {
      const sortBy = this.requestQueryObject.sort.split(',').join(' ');
      this.dbQuery = this.dbQuery.sort(sortBy);
    } else {
      // - indicates descending order in MongoDB
      this.dbQuery = this.dbQuery.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.requestQueryObject.fields) {
      const fields = this.requestQueryObject.fields.split(',').join(' ');
      this.dbQuery = this.dbQuery.select(fields);
    } else {
      // Exclude property
      this.dbQuery = this.dbQuery.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.requestQueryObject.page * 1 || 1; // 1)undefined * 1 === false, 2)convert string to number.
    const limit = this.requestQueryObject.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.dbQuery = this.dbQuery.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
