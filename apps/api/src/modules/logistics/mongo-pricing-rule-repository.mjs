const collectionName = 'pricing_rules';

const normalize = (document) => {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return {
    id: String(_id),
    ...rest
  };
};

export class MongoPricingRuleRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { version: 1 },
        unique: true,
        name: 'pricing_rules_version_unique'
      },
      {
        key: { status: 1, effectiveFrom: -1 },
        name: 'pricing_rules_status_effective_from_idx'
      }
    ]);
  }

  async findActive() {
    return normalize(await this.collection.findOne({ status: 'active' }, { sort: { effectiveFrom: -1 } }));
  }

  async list() {
    const documents = await this.collection.find({}, { sort: { version: -1 } }).toArray();
    return documents.map(normalize);
  }

  async nextVersion() {
    const latest = await this.collection.findOne({}, { sort: { version: -1 } });
    return latest ? latest.version + 1 : 1;
  }

  async save(pricingRule) {
    const now = new Date().toISOString();
    const record = {
      ...pricingRule,
      createdAt: pricingRule.createdAt ?? now,
      updatedAt: now
    };
    const { id, ...document } = record;

    await this.collection.replaceOne(
      { _id: id },
      {
        _id: id,
        ...document
      },
      { upsert: true }
    );

    return normalize(await this.collection.findOne({ _id: id }));
  }

  async retireActiveExcept(activeRuleId) {
    await this.collection.updateMany(
      {
        _id: { $ne: activeRuleId },
        status: 'active'
      },
      {
        $set: {
          status: 'retired',
          effectiveTo: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    );
  }
}
