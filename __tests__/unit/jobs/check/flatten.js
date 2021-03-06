const {flatten} = require('../../../../jobs/check/flatten')

describe('jobs.check.flatten', () => {
  it('should return the file for a simple document', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'file',
      fileTypes: [{ext: 'doc'}]
    })

    expect(res).toMatchSnapshot()
  })

  it('should flatten a shapefile in an index-of', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'index-of',
      children: [
        {
          url: 'http://foo/1.shp',
          type: 'file',
          fileName: 'foo.shp',
          fileTypes: [{ext: 'shp'}]
        },
        {
          url: 'http://foo/1.shx',
          type: 'file',
          fileName: 'foo.shx',
          fileTypes: [{ext: 'shx'}]
        }
      ]
    })

    expect(res).toMatchSnapshot()
  })

  it('should return a sole shapefile in an index-of', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'index-of',
      children: [
        {
          url: 'http://foo/1.shp',
          type: 'file',
          fileName: 'foo.shp',
          fileTypes: [{ext: 'shp'}]
        }
      ]
    })

    expect(res).toMatchSnapshot()
  })

  it('should not consider related files as main when they also have the main type', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'index-of',
      children: [
        {
          url: 'http://foo/file.tiff',
          type: 'file',
          fileName: 'file.tiff',
          fileTypes: [{ext: 'tiff'}]
        },
        {
          url: 'http://foo/file.ovr',
          type: 'file',
          fileName: 'file.ovr',
          fileTypes: [{ext: 'ovr'}, {ext: 'tiff'}]
        }
      ]
    })

    expect(res).toMatchSnapshot()
  })

  it('should return multiple bundles with similar extensions', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'index-of',
      children: [
        {
          url: 'http://foo/file1.shp',
          type: 'file',
          fileName: 'file1.shp',
          fileTypes: [{ext: 'shp'}]
        },
        {
          url: 'http://foo/file1.dbf',
          type: 'file',
          fileName: 'file1.dbf',
          fileTypes: [{ext: 'dbf'}]
        },
        {
          url: 'http://foo/file2.dbf',
          type: 'file',
          fileName: 'file2.dbf',
          fileTypes: [{ext: 'dbf'}]
        }
      ]
    })

    expect(res).toMatchSnapshot()
  })

  it('should support ignored files types', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'file',
      fileTypes: [{ext: 'unknown stuff'}]
    })

    expect(res).toMatchSnapshot()
  })

  it('should correctly process N_PERIM_MAET_ZINF_S_R53_2009', () => {
    expect(
      flatten(require('./__fixtures__/N_PERIM_MAET_ZINF_S_R53_2009.json'))
    ).toMatchSnapshot()
  })

  it('should correctly process HYD_ZON_BassVers_Rade_compl_s', () => {
    expect(
      flatten(require('./__fixtures__/HYD_ZON_BassVers_Rade_compl_s.json'))
    ).toMatchSnapshot()
  })

  it('should correctly process Presence_poissons_2011_N2000_Etangs_et_vallee_TdB', () => {
    expect(
      flatten(require('./__fixtures__/Presence_poissons_2011_N2000_Etangs_et_vallee_TdB.json'))
    ).toMatchSnapshot()
  })
})
